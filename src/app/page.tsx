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

type MarketData = {
  symbol: string;
  currentPrice: number;
  changePercent: number;
  changeScore: number;
  severity: string;
  reasons: string[];
};

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stocks, setStocks] = useState<MarketData[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

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
          console.error("Failed to create watchlist:", createError);
          return;
        }

        watchlist = newWatchlist;

        const starterSymbols = ["AAPL", "NVDA", "TSLA", "MSFT"];

        await supabase.from("watchlist_items").insert(
          starterSymbols.map((symbol) => ({
            watchlist_id: watchlist!.id,
            symbol,
          }))
        );
      }

      if (!watchlist) return;

      const { data: items, error: itemsError } = await supabase
        .from("watchlist_items")
        .select("symbol")
        .eq("watchlist_id", watchlist.id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Failed to load watchlist items:", itemsError);
        return;
      }

      const symbols = (items as WatchlistItem[]).map(
        (item) => item.symbol
      );

      // Get current market scores
      const marketResults = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `/api/market/change-score?symbol=${encodeURIComponent(symbol)}`
            );

            if (!response.ok) return null;

            return (await response.json()) as MarketData;
          } catch {
            return null;
          }
        })
      );

      const currentStocks = marketResults.filter(
        (stock): stock is MarketData => stock !== null
      );

      // Get previous state
      const { data: previousStates } = await supabase
        .from("user_ticker_state")
        .select("symbol, last_change_score, last_price, last_seen_at")
        .eq("user_id", user.id);

      const previousMap = new Map(
        (previousStates ?? []).map((state) => [
          state.symbol,
          state,
        ])
      );

      // Add "since you left" information
      const stocksWithDelta = currentStocks.map((stock) => {
        const previous = previousMap.get(stock.symbol);

        return {
          ...stock,
          previousScore: previous?.last_change_score ?? null,
          previousPrice: previous?.last_price ?? null,
          lastSeenAt: previous?.last_seen_at ?? null,
        };
      });

      console.log("Dashboard market data:", stocksWithDelta);

      setStocks(currentStocks);

      // Send data to Stitch dashboard
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "MARKET_UPDATE",
            stocks: stocksWithDelta,
          },
          window.location.origin
        );
      }, 200);

      // Save current state as the new baseline
      for (const stock of currentStocks) {
        await supabase.from("user_ticker_state").upsert(
          {
            user_id: user.id,
            symbol: stock.symbol,
            last_change_score: stock.changeScore,
            last_price: stock.currentPrice,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,symbol",
          }
        );
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <iframe
        ref={iframeRef}
        src="/dashboard.html"
        title="MarketWatch AI Dashboard"
        className="h-screen w-full border-0"
      />
    </main>
  );
}