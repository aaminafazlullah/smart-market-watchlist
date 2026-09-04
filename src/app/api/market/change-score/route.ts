import { NextRequest, NextResponse } from "next/server";
import {
  calculateDailyReturns,
  calculateStandardDeviation,
  calculatePriceAnomalyScore,
  calculateVolumeAnomalyScore,
  getRecentValues,
  calculateNewsImpactScore,
  calculateEarningsImpactScore,
  calculateChangeScore,
  getChangeSeverity,
  generateChangeReasons,
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

    const [quoteResponse, newsResponse] =
  await Promise.all([
    fetch(
      `${baseUrl}/api/market/quote?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    ),
    fetch(
      `${baseUrl}/api/market/news?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    ),
  ]);

const historyResponse = await fetch(
  `${baseUrl}/api/market/history?symbol=${encodeURIComponent(symbol)}`,
  { cache: "no-store" }
);

const earningsResponse = await fetch(
  `${baseUrl}/api/market/events?symbol=${encodeURIComponent(symbol)}`,
  { cache: "no-store" }
);

    if (!quoteResponse.ok || !historyResponse.ok ||
  !newsResponse.ok ||
  !earningsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: 502 }
      );
    }

    const quote = await quoteResponse.json();
    const history = await historyResponse.json();
    const newsData = await newsResponse.json();
    const earningsData = await earningsResponse.json();
    console.log("EARNINGS DATA:", earningsData);
    const earnings = earningsData.earnings ?? [];

let earningsImpactScore = 0;
let daysUntilEarnings: number | null = null;

if (earnings.length > 0) {
  const nextEarnings = earnings[0];

  if (nextEarnings?.reportDate) {
    const [year, month, day] = nextEarnings.reportDate
      .split("-")
      .map(Number);

    const earningsDate = new Date(
      year,
      month - 1,
      day
    );

    const today = new Date();

    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    daysUntilEarnings = Math.round(
      (earningsDate.getTime() - todayDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    earningsImpactScore =
      calculateEarningsImpactScore(daysUntilEarnings);
  }
}

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
    const changeScore = calculateChangeScore(
    priceAnomalyScore,
    volumeAnomalyScore,
    newsImpactScore,
    earningsImpactScore
  );

    const severity = getChangeSeverity(changeScore);

    const reasons = generateChangeReasons(
     priceAnomalyScore,
     volumeAnomalyScore,
     newsImpactScore,
     earningsImpactScore
    );
    return NextResponse.json({
  symbol: quote.symbol,
  currentPrice: quote.price,
  changePercent: quote.changePercent,

  changeScore,
  severity,
  reasons,

  signals: {
    price: priceAnomalyScore,
    volume: volumeAnomalyScore,
    news: newsImpactScore,
    earnings: earningsImpactScore,
  },

  historicalVolatility: Number(
    volatility.toFixed(2)
  ),

  newsCount: recentNews.length,
  daysUntilEarnings:
    daysUntilEarnings !== null
      ? Number(daysUntilEarnings.toFixed(1))
      : null,
});
  } catch {
    return NextResponse.json(
      { error: "Unable to calculate change score" },
      { status: 500 }
    );
  }
}