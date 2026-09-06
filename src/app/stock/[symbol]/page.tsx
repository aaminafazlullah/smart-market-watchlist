"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = String(params.symbol || "AAPL").toUpperCase();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "REQUEST_PROFILE") {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          window.location.replace("/login");
          return;
        }

        const metadata = data.user.user_metadata ?? {};
        const name =
          metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          data.user.email?.split("@")[0] ||
          "MarketWatch Account";

        const { data: rows, error: watchlistError } = await supabase
          .from("watchlist_items")
          .select("id, symbol, watchlists!inner(user_id)")
          .eq("watchlists.user_id", data.user.id);

        const count = watchlistError
          ? 0
          : new Set((rows ?? []).map((row) => String(row.symbol).toUpperCase()))
              .size;

        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "PROFILE_UPDATE",
            name: String(name),
            email: data.user.email ?? "",
          },
          window.location.origin
        );

        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "WATCHLIST_COUNT",
            count,
          },
          window.location.origin
        );

        return;
      }

      if (event.data?.type === "SIGN_OUT") {
        await supabase.auth.signOut();
        window.location.replace("/login");
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="w-full h-screen bg-background">
      <iframe
        ref={iframeRef}
        src={`/stock-detail.html?symbol=${encodeURIComponent(symbol)}`}
        title={`${symbol} Stock Detail`}
        className="w-full h-full border-0"
      />
    </main>
  );
}
