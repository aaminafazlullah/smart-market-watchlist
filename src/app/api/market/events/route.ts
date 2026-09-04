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

    const lines = csvText
      .trim()
      .split("\n")
      .filter(Boolean);

    if (lines.length <= 1) {
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        earnings: [],
      });
    }

    const headers = lines[0].split(",");

    const earnings = lines.slice(1).map((line) => {
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
    });

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      earnings,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to Alpha Vantage" },
      { status: 500 }
    );
  }
}