import { NextRequest, NextResponse } from "next/server";
import {
  calculateDailyReturns,
  calculateStandardDeviation,
  calculatePriceAnomalyScore,
  calculateVolumeAnomalyScore,
  getRecentValues,
  calculateNewsImpactScore,
} from "@/lib/change-score";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = request.nextUrl.origin;

    const [quoteResponse, historyResponse, newsResponse] = await Promise.all([
    fetch(
      `${baseUrl}/api/market/quote?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    ),
    fetch(
      `${baseUrl}/api/market/history?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    ),
    fetch(
      `${baseUrl}/api/market/news?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    ),
  ]);

    if (!quoteResponse.ok || !historyResponse.ok ||
  !newsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: 502 }
      );
    }

    const quote = await quoteResponse.json();
    const history = await historyResponse.json();
    const newsData = await newsResponse.json();
    const news = newsData.news ?? [];
    const recentNews = news.slice(0, 5);
    const prices = history.history.map(
      (day: { close: number }) => day.close
    );
    const volumes = history.history.map(
      (day: { volume: number }) => day.volume
    );

    const historicalReturns = calculateDailyReturns(prices);

    const recentReturns = getRecentValues(
      historicalReturns,
      20
    );

    const volatility =
      calculateStandardDeviation(recentReturns);

    const priceAnomalyScore = calculatePriceAnomalyScore(
      quote.changePercent,
      recentReturns
    );

    const currentVolume = volumes[0];

    const historicalVolumes = getRecentValues(
      volumes.slice(1),
      20
    );

    const volumeAnomalyScore = calculateVolumeAnomalyScore(
    currentVolume,
    historicalVolumes
   );

   const partialScore = Math.round(
   priceAnomalyScore * 0.4 +
   volumeAnomalyScore * 0.25
   );
   const latestNewsTimestamp =
    recentNews.length > 0
    ? recentNews.reduce(
        (
          latest: number,
          article: { datetime?: number }
        ) => Math.max(latest, article.datetime ?? 0),
        0
      )
    : 0;

    const hoursSinceLatestNews =
      latestNewsTimestamp > 0
    ? (Date.now() / 1000 - latestNewsTimestamp) / 3600
    : Infinity;

    const newsImpactScore = calculateNewsImpactScore(
    recentNews.length,
    hoursSinceLatestNews
    );
    return NextResponse.json({
    symbol: quote.symbol,
    currentPrice: quote.price,
    changePercent: quote.changePercent,
    historicalVolatility: Number(volatility.toFixed(2)),
    priceAnomalyScore,
    volumeAnomalyScore,
    newsImpactScore,
    newsCount: recentNews.length,
  });
  } catch {
    return NextResponse.json(
      { error: "Unable to calculate change score" },
      { status: 500 }
    );
  }
}