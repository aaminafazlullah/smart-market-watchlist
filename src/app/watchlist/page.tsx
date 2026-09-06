"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Item = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  score: number;
  reasons: string[];
  companyName: string;
};

export default function WatchlistPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    let iframeReady = false;
    let loading = false;

    const send = (message: unknown) => {
      if (!iframeReady) return;

      iframeRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin
      );
    };

    const sendProfileUpdate = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || !active) return;

      const user = data.user;

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "MarketWatch Account";

      send({
        type: "PROFILE_UPDATE",
        name,
        email: user.email ?? "",
      });
    };

    const load = async () => {
      if (loading || !active || !iframeReady) return;

      loading = true;

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          if (active) {
            send({ type: "WATCHLIST_ERROR" });
          }
          return;
        }

        const userId = userData.user.id;

        /*
         * Get all watchlists owned by this user.
         */
        const { data: lists, error: listsError } = await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (listsError) {
          console.error("Failed to load watchlists:", listsError);

          if (active) {
            send({ type: "WATCHLIST_ERROR" });
          }

          return;
        }

        const watchlistIds = (lists ?? []).map((list) => list.id);

        /*
         * No watchlists yet.
         */
        if (watchlistIds.length === 0) {
          if (active) {
            send({
              type: "WATCHLIST_UPDATE",
              items: [],
            });

            await sendProfileUpdate();
          }

          return;
        }

        /*
         * Get all items from all of the user's watchlists.
         */
        const { data: rows, error: itemsError } = await supabase
          .from("watchlist_items")
          .select("id, symbol, created_at")
          .in("watchlist_id", watchlistIds)
          .order("created_at", { ascending: true });

        if (itemsError) {
          console.error(
            "Failed to load watchlist items:",
            itemsError
          );

          if (active) {
            send({ type: "WATCHLIST_ERROR" });
          }

          return;
        }

        const symbols = Array.from(
          new Set(
            (rows ?? [])
              .map((row) => String(row.symbol).toUpperCase())
              .filter(Boolean)
          )
        );

        /*
         * No stocks in the watchlist.
         */
        if (symbols.length === 0) {
          if (active) {
            send({
              type: "WATCHLIST_UPDATE",
              items: [],
            });

            await sendProfileUpdate();
          }

          return;
        }

        /*
         * Fetch quote + change score for every stock.
         * Promise.allSettled prevents one failed API call
         * from breaking the entire watchlist.
         */
        const items: Item[] = await Promise.all(
          symbols.map(async (symbol) => {
            let quote: any = {};
            let score: any = {};

            try {
              const response = await fetch(
                `/api/market/quote?symbol=${encodeURIComponent(symbol)}`,
                {
                  cache: "no-store",
                }
              );

              if (response.ok) {
                quote = await response.json();
              } else {
                console.error(
                  `Quote API failed for ${symbol}:`,
                  response.status
                );
              }
            } catch (error) {
              console.error(
                `Quote request failed for ${symbol}:`,
                error
              );
            }

            try {
              const response = await fetch(
                `/api/market/change-score?symbol=${encodeURIComponent(
                  symbol
                )}`,
                {
                  cache: "no-store",
                }
              );

              if (response.ok) {
                score = await response.json();
              } else {
                console.error(
                  `Change score API failed for ${symbol}:`,
                  response.status
                );
              }
            } catch (error) {
              console.error(
                `Change score request failed for ${symbol}:`,
                error
              );
            }

            const price = Number(quote.price);
            const changePercent = Number(quote.changePercent);
            const changeScore = Number(score.changeScore);

            return {
              symbol,
              price: Number.isFinite(price) ? price : null,
              changePercent: Number.isFinite(changePercent)
                ? changePercent
                : null,
              score: Number.isFinite(changeScore)
                ? changeScore
                : 0,
              reasons: Array.isArray(score.reasons)
                ? score.reasons
                : ["No major changes detected"],
              companyName:
                quote.companyName ||
                score.companyName ||
                "Market Asset",
            };
          })
        );

        if (!active) return;

        send({
          type: "WATCHLIST_UPDATE",
          items,
        });

        await sendProfileUpdate();
      } finally {
        loading = false;
      }
    };

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const type = event.data?.type;

      /*
       * Profile requested by the iframe.
       */
      if (type === "REQUEST_PROFILE") {
        await sendProfileUpdate();
        return;
      }

      /*
       * Navigate the parent Next.js application,
       * rather than navigating inside the iframe.
       */
      if (type === "NAVIGATE") {
        const href = String(event.data?.href || "");

        if (
          href &&
          href.startsWith("/") &&
          !href.startsWith("//")
        ) {
          window.location.assign(href);
        }

        return;
      }

      /*
       * Sign out.
       */
      if (type === "SIGN_OUT") {
        await supabase.auth.signOut();
        window.location.replace("/login");
        return;
      }

      /*
       * Refresh watchlist.
       */
      if (type === "SYNC_NOW") {
        await load();

        if (active) {
          send({ type: "SYNC_COMPLETE" });
        }

        return;
      }

      /*
       * Add stock.
       */
      if (type === "ADD_STOCK") {
        const symbol = String(event.data?.symbol || "")
          .trim()
          .toUpperCase();

        if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
          return;
        }

        const { data: userData } =
          await supabase.auth.getUser();

        if (!userData.user) return;

        /*
         * Use the first existing watchlist.
         * If none exists, create one.
         */
        let { data: list, error: listError } = await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (listError) {
          console.error(
            "Failed to find watchlist:",
            listError
          );
          return;
        }

        if (!list) {
          const created = await supabase
            .from("watchlists")
            .insert({
              user_id: userData.user.id,
              name: "My Watchlist",
            })
            .select("id")
            .single();

          if (created.error) {
            console.error(
              "Failed to create watchlist:",
              created.error
            );
            return;
          }

          list = created.data;
        }

        if (!list?.id) return;

        const { error } = await supabase
          .from("watchlist_items")
          .insert({
            watchlist_id: list.id,
            symbol,
          });

        /*
         * 23505 = duplicate stock.
         * That's okay.
         */
        if (error && error.code !== "23505") {
          console.error(
            "Failed to add stock:",
            error
          );
          return;
        }

        await load();
        return;
      }

      /*
       * Remove stock.
       */
      if (type === "REMOVE_STOCK") {
        const symbol = String(event.data?.symbol || "")
          .trim()
          .toUpperCase();

        if (!symbol) return;

        const { data: userData } =
          await supabase.auth.getUser();

        if (!userData.user) return;

        const { data: lists, error: listsError } =
          await supabase
            .from("watchlists")
            .select("id")
            .eq("user_id", userData.user.id);

        if (listsError) {
          console.error(
            "Failed to find watchlists:",
            listsError
          );
          return;
        }

        const ids = (lists ?? []).map((x) => x.id);

        if (ids.length > 0) {
          const { error } = await supabase
            .from("watchlist_items")
            .delete()
            .eq("symbol", symbol)
            .in("watchlist_id", ids);

          if (error) {
            console.error(
              "Failed to remove stock:",
              error
            );
            return;
          }
        }

        await load();
      }
    };

    const iframe = iframeRef.current;

    const onIframeLoad = async () => {
      iframeReady = true;

      /*
       * The iframe is now ready to receive postMessage.
       */
      await sendProfileUpdate();
      await load();
    };

    iframe?.addEventListener("load", onIframeLoad);
    window.addEventListener("message", onMessage);

    /*
     * If the iframe is already loaded when the effect runs.
     */
    if (iframe?.contentDocument?.readyState === "complete") {
      onIframeLoad();
    }

    return () => {
      active = false;

      iframe?.removeEventListener(
        "load",
        onIframeLoad
      );

      window.removeEventListener(
        "message",
        onMessage
      );
    };
  }, []);

  return (
    <main className="w-full h-screen overflow-hidden bg-background">
      <iframe
        ref={iframeRef}
        src="/watchlist.html"
        title="Watchlist"
        className="w-full h-full border-0"
      />
    </main>
  );
}