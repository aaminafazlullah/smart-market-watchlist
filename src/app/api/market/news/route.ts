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
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 2);

    const formatDate = (date: Date) =>
      date.toISOString().split("T")[0];

    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
        symbol
      )}&from=${formatDate(fromDate)}&to=${formatDate(
        today
      )}&token=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Finnhub news request failed",
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const cutoff = Date.now() / 1000 - 24 * 60 * 60;

    const recentNews = data
      .filter(
        (article: { datetime?: number }) =>
          article.datetime && article.datetime >= cutoff
      )
      .sort(
        (
          a: { datetime?: number },
          b: { datetime?: number }
        ) => (b.datetime ?? 0) - (a.datetime ?? 0)
      )
      .slice(0, 5);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      news: recentNews,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to Finnhub" },
      { status: 500 }
    );
  }
}