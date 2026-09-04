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
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
        symbol
      )}&outputsize=compact&apikey=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Alpha Vantage historical data request failed",
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data["Error Message"]) {
      return NextResponse.json(
        {
          error: "Invalid symbol or Alpha Vantage request",
          details: data["Error Message"],
        },
        { status: 400 }
      );
    }

    if (data["Note"]) {
      return NextResponse.json(
        {
          error: "Alpha Vantage API limit reached",
          details: data["Note"],
        },
        { status: 429 }
      );
    }

    const timeSeries = data["Time Series (Daily)"];

    if (!timeSeries) {
      return NextResponse.json(
        {
          error: "Historical data unavailable",
          alphaVantageResponse: data,
        },
        { status: 502 }
      );
    }

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

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      history,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to Alpha Vantage" },
      { status: 500 }
    );
  }
}