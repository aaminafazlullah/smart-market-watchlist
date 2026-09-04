import { NextRequest, NextResponse } from "next/server";
import { getFallbackEarnings } from "@/lib/market-fallback";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  const normalizedSymbol = symbol.toUpperCase();
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  // If the API key is unavailable, use fallback data.
  if (!apiKey) {
    return NextResponse.json({
      symbol: normalizedSymbol,
      earnings: getFallbackEarnings(normalizedSymbol),
      source: "fallback",
      degraded: true,
    });
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${encodeURIComponent(
        normalizedSymbol
      )}&horizon=3month&apikey=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        symbol: normalizedSymbol,
        earnings: getFallbackEarnings(normalizedSymbol),
        source: "fallback",
        degraded: true,
      });
    }

    const csvText = await response.text();

    // Alpha Vantage may return a rate-limit message
    // even when the HTTP response is successful.
    if (
      csvText.includes("Thank you for using Alpha Vantage") ||
      csvText.includes("API call frequency") ||
      csvText.toLowerCase().includes("rate limit")
    ) {
      return NextResponse.json({
        symbol: normalizedSymbol,
        earnings: getFallbackEarnings(normalizedSymbol),
        source: "fallback",
        degraded: true,
      });
    }

    const lines = csvText
      .trim()
      .split("\n")
      .filter(Boolean);

    if (lines.length <= 1) {
      return NextResponse.json({
        symbol: normalizedSymbol,
        earnings: [],
        source: "live",
        degraded: false,
      });
    }

    const headers = lines[0].split(",");

    const earnings = lines
      .slice(1)
      .map((line) => {
        const values = line.split(",");

        const record: Record<string, string> = {};

        headers.forEach((header, index) => {
          record[header] = values[index] ?? "";
        });

        return {
          symbol: record.symbol,
          reportDate: record.reportDate,
          fiscalDateEnding: record.fiscalDateEnding,
          estimate: record.estimate
            ? Number(record.estimate)
            : null,
          currency: record.currency,
          timeOfTheDay: record.timeOfTheDay,
        };
      })
      .filter(
        (event) =>
          event.symbol === normalizedSymbol &&
          /^\d{4}-\d{2}-\d{2}$/.test(event.reportDate)
      );

    // If Alpha Vantage returned something unexpected or malformed,
    // don't pass bad data into the Change Engine.
    if (earnings.length === 0) {
      return NextResponse.json({
        symbol: normalizedSymbol,
        earnings: getFallbackEarnings(normalizedSymbol),
        source: "fallback",
        degraded: true,
      });
    }

    return NextResponse.json({
      symbol: normalizedSymbol,
      earnings,
      source: "live",
      degraded: false,
    });
  } catch {
    return NextResponse.json({
      symbol: normalizedSymbol,
      earnings: getFallbackEarnings(normalizedSymbol),
      source: "fallback",
      degraded: true,
    });
  }
}