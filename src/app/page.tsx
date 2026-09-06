"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type WatchlistItem = {
  id: string;
  symbol: string;
};

type PreviousState = {
  symbol: string;
  last_change_score: number;
  last_price: number | null;
  last_seen_at: string;
};

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const syncRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const getUserWatchlist = async (): Promise<WatchlistItem[]> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Unable to get authenticated user:", userError);
        return [];
      }

      const { data: watchlists, error } = await supabase
        .from("watchlists")
        .select("id, watchlist_items(id, symbol)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load watchlist:", error);
        return [];
      }

      return (watchlists?.watchlist_items ?? []) as WatchlistItem[];
    };

    const sendProfileUpdate = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("No authenticated user for profile:", error);
        return;
      }

      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "PROFILE_UPDATE",
          email: user.email ?? "Authenticated user",
        },
        window.location.origin
      );
    };

    const loadDashboard = async () => {
      console.log("Loading dashboard...");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No authenticated user");
        window.location.replace("/login");
        return;
      }

      // Supply the real Supabase account email to the profile menu.
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "PROFILE_UPDATE",
          email: user.email ?? "Authenticated user",
        },
        window.location.origin
      );

      const watchlistItems = await getUserWatchlist();

      console.log(
        "Watchlist:",
        watchlistItems.map((item) => item.symbol)
      );

      if (watchlistItems.length === 0) {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "MARKET_UPDATE",
            stocks: [],
          },
          window.location.origin
        );
        return;
      }

      const symbols = watchlistItems.map((item) => item.symbol);

      // Read previous state BEFORE overwriting it.
      const { data: previousStates, error: stateError } = await supabase
        .from("user_ticker_state")
        .select(
          "symbol, last_change_score, last_price, last_seen_at"
        )
        .eq("user_id", user.id)
        .in("symbol", symbols);

      if (stateError) {
        console.error("Failed to load previous ticker state:", stateError);
      }

      const previousMap = new Map<string, PreviousState>();

      (previousStates ?? []).forEach((state) => {
        previousMap.set(state.symbol, state as PreviousState);
      });

      // Fetch the real change score for every ticker.
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `/api/market/change-score?symbol=${encodeURIComponent(symbol)}`,
              {
                cache: "no-store",
              }
            );

            if (!response.ok) {
              console.error(
                `Market API failed for ${symbol}:`,
                response.status
              );
              return null;
            }

            return await response.json();
          } catch (error) {
            console.error(`Market API error for ${symbol}:`, error);
            return null;
          }
        })
      );

      const stocksWithDelta = results
        .filter(Boolean)
        .map((stock: any) => {
          const previous = previousMap.get(stock.symbol);

          return {
            ...stock,
            previousScore: previous?.last_change_score ?? 0,
            previousPrice:
              previous?.last_price !== null &&
              previous?.last_price !== undefined
                ? Number(previous.last_price)
                : null,
            lastSeenAt: previous?.last_seen_at ?? null,
          };
        });

      console.log("Sending MARKET_UPDATE:", stocksWithDelta);

      // IMPORTANT:
      // Send the previous state + current state to the iframe BEFORE
      // updating user_ticker_state.
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "MARKET_UPDATE",
          stocks: stocksWithDelta,
        },
        window.location.origin
      );

      // Now persist the current state for the NEXT visit/sync.
      const stateRows = stocksWithDelta.map((stock: any) => ({
        user_id: user.id,
        symbol: stock.symbol,
        last_change_score: stock.changeScore,
        last_price: stock.currentPrice,
        last_seen_at: new Date().toISOString(),
      }));

      if (stateRows.length > 0) {
        const { error: upsertError } = await supabase
          .from("user_ticker_state")
          .upsert(stateRows, {
            onConflict: "user_id,symbol",
          });

        if (upsertError) {
          console.error(
            "Failed to update user_ticker_state:",
            upsertError
          );
        } else {
          console.log("Ticker state updated.");
        }
      }
    };

    syncRef.current = loadDashboard;

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "REQUEST_PROFILE") {
        await sendProfileUpdate();
        return;
      }

      if (event.data?.type === "SIGN_OUT") {
        console.log("SIGN OUT requested");

        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Sign out failed:", error);

          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "SIGN_OUT_ERROR",
              message: error.message,
            },
            window.location.origin
          );

          return;
        }

        console.log("Supabase session cleared");

        window.location.replace("/login");
        return;
      }

      if (event.data?.type === "SYNC_NOW") {
        console.log("SYNC NOW requested");

        try {
          await syncRef.current?.();

          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "SYNC_COMPLETE",
            },
            window.location.origin
          );

          console.log("SYNC COMPLETE");
        } catch (error) {
          console.error("SYNC ERROR:", error);

          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "SYNC_ERROR",
              message: "Market sync failed",
            },
            window.location.origin
          );
        }

        return;
      }

      if (event.data?.type === "ADD_STOCK") {
        const symbol = String(event.data.symbol || "")
          .trim()
          .toUpperCase();

        if (!symbol) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: watchlist, error: watchlistError } =
          await supabase
            .from("watchlists")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (watchlistError || !watchlist) {
          console.error("Could not find watchlist:", watchlistError);
          return;
        }

        const { error } = await supabase
          .from("watchlist_items")
          .insert({
            watchlist_id: watchlist.id,
            symbol,
          });

        if (error) {
          console.error("Failed to add stock:", error);
          return;
        }

        console.log(`Added ${symbol}`);
        await syncRef.current?.();
        return;
      }

      if (event.data?.type === "REMOVE_STOCK") {
        const symbol = String(event.data.symbol || "")
          .trim()
          .toUpperCase();

        if (!symbol) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: watchlist, error: watchlistError } =
          await supabase
            .from("watchlists")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (watchlistError || !watchlist) {
          console.error("Could not find watchlist:", watchlistError);
          return;
        }

        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("watchlist_id", watchlist.id)
          .eq("symbol", symbol);

        if (error) {
          console.error("Failed to remove stock:", error);
          return;
        }

        console.log(`Removed ${symbol}`);
        await syncRef.current?.();
      }
    };

    window.addEventListener("message", handleMessage);

    // Initial load.
    loadDashboard();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <main className="w-full h-screen overflow-hidden bg-background">
      <iframe
        ref={iframeRef}
        src="/dashboard.html"
        title="MarketWatch AI Dashboard"
        className="w-full h-full border-0"
      />
    </main>
  );
}
