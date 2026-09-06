"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = String(params.symbol || "AAPL").toUpperCase();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    let iframeReady = false;

    const send = (message: unknown) => {
      if (!iframeReady || !active) return;

      iframeRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin
      );
    };

    const sendProfileAndCount = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        window.location.replace("/login");
        return;
      }

      const user = data.user;
      const metadata = user.user_metadata ?? {};

      const name =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name ||
        user.email?.split("@")[0] ||
        "MarketWatch Account";

      send({
        type: "PROFILE_UPDATE",
        name: String(name),
        email: user.email ?? "",
      });

      /*
       * Get all watchlists owned by this user first.
       */
      const { data: lists, error: listsError } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", user.id);

      if (listsError) {
        console.error(
          "Failed to load watchlists:",
          listsError
        );

        send({
          type: "WATCHLIST_COUNT",
          count: 0,
        });

        return;
      }

      const watchlistIds = (lists ?? []).map(
        (list) => list.id
      );

      if (watchlistIds.length === 0) {
        send({
          type: "WATCHLIST_COUNT",
          count: 0,
        });

        return;
      }

      /*
       * Get the items from those watchlists.
       */
      const { data: rows, error: itemsError } =
        await supabase
          .from("watchlist_items")
          .select("symbol")
          .in("watchlist_id", watchlistIds);

      if (itemsError) {
        console.error(
          "Failed to load watchlist items:",
          itemsError
        );

        send({
          type: "WATCHLIST_COUNT",
          count: 0,
        });

        return;
      }

      const count = new Set(
        (rows ?? []).map((row) =>
          String(row.symbol).toUpperCase()
        )
      ).size;

      send({
        type: "WATCHLIST_COUNT",
        count,
      });
    };

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.source !==
        iframeRef.current?.contentWindow
      ) {
        return;
      }

      const type = event.data?.type;

      if (type === "REQUEST_PROFILE") {
        await sendProfileAndCount();
        return;
      }

      /*
       * Navigation must happen on the parent page,
       * not inside the iframe.
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

      if (type === "SIGN_OUT") {
        await supabase.auth.signOut();
        window.location.replace("/login");
      }
    };

    const onIframeLoad = async () => {
      iframeReady = true;
      await sendProfileAndCount();
    };

    const iframe = iframeRef.current;

    iframe?.addEventListener(
      "load",
      onIframeLoad
    );

    window.addEventListener(
      "message",
      onMessage
    );

    /*
     * Handle the case where the iframe has already
     * finished loading before the listener was attached.
     */
    if (
      iframe?.contentDocument?.readyState ===
      "complete"
    ) {
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
    <main className="w-full h-screen bg-background">
      <iframe
        ref={iframeRef}
        src={`/stock-detail.html?symbol=${encodeURIComponent(
          symbol
        )}`}
        title={`${symbol} Stock Detail`}
        className="w-full h-full border-0"
      />
    </main>
  );
}