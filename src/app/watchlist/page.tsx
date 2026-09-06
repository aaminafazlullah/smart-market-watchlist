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
    let pendingMessage: unknown = null;
    let loading = false;

    const send = (message: unknown) => {
      if (!iframeReady) {
        pendingMessage = message;
        return;
      }
      iframeRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin
      );
    };

    const sendProfileUpdate = async () => {
      const { data } = await supabase.auth.getUser();
      if (active) {
        send({
          type: "PROFILE_UPDATE",
          email: data.user?.email ?? "MarketWatch Account",
        });
      }
    };

    const load = async () => {
      if (loading) return;
      loading = true;

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          if (active) send({ type: "WATCHLIST_ERROR" });
          return;
        }

        const { data: rows, error } = await supabase
          .from("watchlist_items")
          .select("id, symbol, watchlists!inner(user_id)")
          .eq("watchlists.user_id", userData.user.id)
          .order("created_at", { ascending: true });

        if (error) {
          if (active) send({ type: "WATCHLIST_ERROR" });
          return;
        }

        const symbols = Array.from(
          new Set((rows ?? []).map((row) => row.symbol.toUpperCase()))
        );

        const items: Item[] = await Promise.all(
          symbols.map(async (symbol) => {
            const [quoteResult, scoreResult] = await Promise.allSettled([
              fetch(
                `/api/market/quote?symbol=${encodeURIComponent(symbol)}`,
                { cache: "no-store" }
              ).then((r) => r.json()),
              fetch(
                `/api/market/change-score?symbol=${encodeURIComponent(symbol)}`,
                { cache: "no-store" }
              ).then((r) => r.json()),
            ]);

            const quote =
              quoteResult.status === "fulfilled" ? quoteResult.value : {};
            const score =
              scoreResult.status === "fulfilled" ? scoreResult.value : {};

            return {
              symbol,
              price: Number.isFinite(Number(quote.price))
                ? Number(quote.price)
                : null,
              changePercent: Number.isFinite(Number(quote.changePercent))
                ? Number(quote.changePercent)
                : null,
              score: Number(score.changeScore ?? 0),
              reasons: Array.isArray(score.reasons)
                ? score.reasons
                : ["No major changes detected"],
              companyName: "Market Asset",
            };
          })
        );

        if (active) {
          send({ type: "WATCHLIST_UPDATE", items });
          await sendProfileUpdate();
        }
      } finally {
        loading = false;
      }
    };

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const type = event.data?.type;

      if (type === "REQUEST_PROFILE") {
        await sendProfileUpdate();
        return;
      }

      if (type === "SIGN_OUT") {
        await supabase.auth.signOut();
        window.location.replace("/login");
        return;
      }

      if (type === "SYNC_NOW") {
        await load();
        send({ type: "SYNC_COMPLETE" });
        return;
      }

      if (type === "ADD_STOCK") {
        const symbol = String(event.data?.symbol || "")
          .trim()
          .toUpperCase();

        if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) return;

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        let { data: list } = await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!list) {
          const created = await supabase
            .from("watchlists")
            .insert({
              user_id: userData.user.id,
              name: "My Watchlist",
            })
            .select("id")
            .single();

          list = created.data;
        }

        if (list?.id) {
          const { error } = await supabase
            .from("watchlist_items")
            .insert({
              watchlist_id: list.id,
              symbol,
            });

          if (error && error.code !== "23505") {
            console.error("Failed to add stock:", error);
            return;
          }

          await load();
        }

        return;
      }

      if (type !== "REMOVE_STOCK") return;

      const symbol = String(event.data.symbol || "").toUpperCase();
      if (!symbol) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: lists } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", userData.user.id);

      const ids = (lists ?? []).map((x) => x.id);

      if (ids.length) {
        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("symbol", symbol)
          .in("watchlist_id", ids);

        if (error) {
          console.error("Failed to remove stock:", error);
          return;
        }
      }

      await load();
    };

    const iframe = iframeRef.current;

    const onIframeLoad = () => {
      iframeReady = true;

      if (pendingMessage) {
        iframe?.contentWindow?.postMessage(
          pendingMessage,
          window.location.origin
        );
        pendingMessage = null;
      } else {
        load();
      }
    };

    iframe?.addEventListener("load", onIframeLoad);
    window.addEventListener("message", onMessage);

    return () => {
      active = false;
      iframe?.removeEventListener("load", onIframeLoad);
      window.removeEventListener("message", onMessage);
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
