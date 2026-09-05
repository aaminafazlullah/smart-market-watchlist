"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type WatchlistItem = {
  symbol: string;
};

type Watchlist = {
  id: string;
  name: string;
};

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    async function loadWatchlist() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Get the user's existing watchlist
      const { data: watchlists, error } = await supabase
        .from("watchlists")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        console.error("Failed to load watchlists:", error);
        return;
      }

      let watchlist: Watchlist | null = watchlists?.[0] ?? null;

      // Create a default watchlist for a new user
      if (!watchlist) {
        const { data: newWatchlist, error: createError } =
          await supabase
            .from("watchlists")
            .insert({
              user_id: user.id,
              name: "My Watchlist",
            })
            .select("id, name")
            .single();

        if (createError) {
          console.error(
            "Failed to create watchlist:",
            createError
          );
          return;
        }

        watchlist = newWatchlist;

        // Starter stocks
        const starterSymbols = [
          "AAPL",
          "NVDA",
          "TSLA",
          "MSFT",
        ];

        const { error: itemsError } = await supabase
          .from("watchlist_items")
          .insert(
            starterSymbols.map((symbol) => ({
              watchlist_id: watchlist!.id,
              symbol,
            }))
          );

        if (itemsError) {
          console.error(
            "Failed to add starter stocks:",
            itemsError
          );
        }
      }

      // Make sure TypeScript knows the watchlist exists
      if (!watchlist) {
        console.error("No watchlist available");
        return;
      }

      // Load stocks from the user's watchlist
      const { data: items, error: itemsError } = await supabase
        .from("watchlist_items")
        .select("symbol")
        .eq("watchlist_id", watchlist.id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error(
          "Failed to load watchlist items:",
          itemsError
        );
        return;
      }

      const loadedSymbols = (items as WatchlistItem[]).map(
        (item) => item.symbol
      );

      console.log("User watchlist:", loadedSymbols);

      setSymbols(loadedSymbols);
    }

    loadWatchlist();
  }, []);

  function sendWatchlistToIframe() {
    if (!iframeRef.current?.contentWindow) {
      return;
    }

    console.log(
      "Sending watchlist to dashboard:",
      symbols
    );

    iframeRef.current.contentWindow.postMessage(
      {
        type: "WATCHLIST_UPDATE",
        symbols,
      },
      window.location.origin
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <iframe
        ref={iframeRef}
        src="/dashboard.html"
        title="MarketWatch AI Dashboard"
        onLoad={sendWatchlistToIframe}
        className="h-screen w-full border-0"
      />
    </main>
  );
}