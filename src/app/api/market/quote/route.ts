import { NextRequest, NextResponse } from "next/server";
import { quoteSchema } from "@/lib/market-schema";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Finnhub API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: response.status }
      );
    }

    const rawData = await response.json();

    const result = quoteSchema.safeParse(rawData);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid market data received" },
        { status: 502 }
      );
    }

    const data = result.data;

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: data.t,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to market data provider" },
      { status: 500 }
    );
  }
}