import { supabase } from "@/lib/supabase";

export type CachedHistoryDay = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const HISTORY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function getCachedHistory(
  symbol: string
): Promise<CachedHistoryDay[] | null> {
  const normalizedSymbol = symbol.toUpperCase();

  const { data, error } = await supabase
    .from("market_history_cache")
    .select(
      "date, open, high, low, close, volume, fetched_at"
    )
    .eq("symbol", normalizedSymbol)
    .order("date", { ascending: false });

  if (error || !data || data.length < 20) {
    return null;
  }

  const newestFetchedAt = new Date(
    data[0].fetched_at
  ).getTime();

  const cacheAge = Date.now() - newestFetchedAt;

  if (cacheAge > HISTORY_CACHE_MAX_AGE_MS) {
    return null;
  }

  return data.map((row) => ({
    date: row.date,
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  }));
}

export async function saveHistoryToCache(
  symbol: string,
  history: CachedHistoryDay[],
  source: "alphavantage" | "fallback" = "alphavantage"
): Promise<void> {
  const normalizedSymbol = symbol.toUpperCase();

  const rows = history.map((day) => ({
    symbol: normalizedSymbol,
    date: day.date,
    open: day.open,
    high: day.high,
    low: day.low,
    close: day.close,
    volume: day.volume,
    source,
    fetched_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("market_history_cache")
    .upsert(rows, {
      onConflict: "symbol,date",
    });

  if (error) {
    console.error("Failed to save history cache:", error);
  }
}