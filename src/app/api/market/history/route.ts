import { NextRequest, NextResponse } from "next/server";
import {
  getCachedHistory,
  saveHistoryToCache,
} from "@/lib/market-cache";
import { getFallbackHistory } from "@/lib/market-fallback";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  const normalizedSymbol = symbol.toUpperCase();

  // 1. Try the cache first.
  try {
    const cachedHistory = await getCachedHistory(normalizedSymbol);

    if (cachedHistory) {
      return NextResponse.json({
        symbol: normalizedSymbol,
        history: cachedHistory,
        source: "cache",
        degraded: false,
      });
    }
  } catch (error) {
    console.error("Cache read failed:", error);
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  // 2. If there is no usable cache, try Alpha Vantage.
  if (apiKey) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
          normalizedSymbol
        )}&outputsize=compact&apikey=${apiKey}`,
        {
          cache: "no-store",
        }
      );

      if (response.ok) {
        const data = await response.json();

        const timeSeries = data["Time Series (Daily)"];

        if (timeSeries && !data["Error Message"] && !data["Note"]) {
          const history = Object.entries(timeSeries).map(
            ([date, values]) => {
              const daily = values as {
                "1. open": string;
                "2. high": string;
                "3. low": string;
                "4. close": string;
                "5. volume": string;
              };

              return {
                date,
                open: Number(daily["1. open"]),
                high: Number(daily["2. high"]),
                low: Number(daily["3. low"]),
                close: Number(daily["4. close"]),
                volume: Number(daily["5. volume"]),
              };
            }
          );

          // 3. Save successful provider data to the cache.
          await saveHistoryToCache(
            normalizedSymbol,
            history
          );

          return NextResponse.json({
            symbol: normalizedSymbol,
            history,
            source: "live",
            degraded: false,
          });
        }
      }
    } catch (error) {
      console.error(
        "Alpha Vantage history request failed:",
        error
      );
    }
  }

  // 4. Last resort: deterministic fallback.
  return NextResponse.json({
    symbol: normalizedSymbol,
    history: getFallbackHistory(normalizedSymbol),
    source: "fallback",
    degraded: true,
  });
}