import { NextRequest, NextResponse } from "next/server";

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
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 7);

    const formatDate = (date: Date) =>
      date.toISOString().split("T")[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
        symbol
      )}&from=${formatDate(from)}&to=${formatDate(today)}&token=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Finnhub news request failed",
          status: response.status,
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      news: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to Finnhub" },
      { status: 500 }
    );
  }
}