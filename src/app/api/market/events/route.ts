import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Alpha Vantage API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${encodeURIComponent(
        symbol
      )}&horizon=3month&apikey=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Alpha Vantage earnings request failed",
          status: response.status,
        },
        { status: response.status }
      );
    }

    const csvText = await response.text();

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      earningsCsv: csvText,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to Alpha Vantage" },
      { status: 500 }
    );
  }
}