export function calculateDailyReturns(prices: number[]): number[] {
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const previousPrice = prices[i - 1];
    const currentPrice = prices[i];

    if (previousPrice <= 0) continue;

    const dailyReturn =
      ((currentPrice - previousPrice) / previousPrice) * 100;

    returns.push(dailyReturn);
  }

  return returns;
}

export function calculateStandardDeviation(
  values: number[]
): number {
  if (values.length === 0) return 0;

  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const squaredDifferences = values.map(
    (value) => Math.pow(value - mean, 2)
  );

  const variance =
    squaredDifferences.reduce((sum, value) => sum + value, 0) /
    values.length;

  return Math.sqrt(variance);
}

export function calculatePriceAnomalyScore(
  currentChangePercent: number,
  historicalReturns: number[]
): number {
  if (historicalReturns.length < 5) {
    return 0;
  }

  const volatility = calculateStandardDeviation(historicalReturns);

  if (volatility === 0) {
    return 0;
  }

  const zScore =
    Math.abs(currentChangePercent) / volatility;

  const score = (zScore / 3) * 100;

  return Math.min(Math.round(score), 100);
}
export function calculateVolumeAnomalyScore(
  currentVolume: number,
  historicalVolumes: number[]
): number {
  if (historicalVolumes.length < 5 || currentVolume <= 0) {
    return 0;
  }

  const averageVolume =
    historicalVolumes.reduce(
      (sum, volume) => sum + volume,
      0
    ) / historicalVolumes.length;

  if (averageVolume <= 0) {
    return 0;
  }

  const volumeRatio = currentVolume / averageVolume;

  const score = ((volumeRatio - 1) / 2) * 100;

  return Math.min(Math.max(Math.round(score), 0), 100);
}
export function getRecentValues(
  values: number[],
  count: number
): number[] {
  return values.slice(0, count);
}
export function calculateNewsImpactScore(
  newsCount: number,
  hoursSinceLatestNews: number
): number {
  if (newsCount <= 0) {
    return 0;
  }

  let score = 0;

  // Recency is the main signal.
  if (hoursSinceLatestNews <= 2) {
    score += 60;
  } else if (hoursSinceLatestNews <= 6) {
    score += 45;
  } else if (hoursSinceLatestNews <= 12) {
    score += 30;
  } else if (hoursSinceLatestNews <= 24) {
    score += 15;
  }

  // Number of recent articles adds a smaller signal.
  if (newsCount >= 5) {
    score += 25;
  } else if (newsCount >= 3) {
    score += 15;
  } else if (newsCount >= 2) {
    score += 10;
  } else {
    score += 5;
  }

  return Math.min(score, 100);
}
export function calculateEarningsImpactScore(
  daysUntilEarnings: number
): number {
  if (daysUntilEarnings < 0) {
    return 0;
  }

  if (daysUntilEarnings <= 1) {
    return 100;
  }

  if (daysUntilEarnings <= 3) {
    return 80;
  }

  if (daysUntilEarnings <= 7) {
    return 60;
  }

  if (daysUntilEarnings <= 14) {
    return 35;
  }

  if (daysUntilEarnings <= 30) {
    return 15;
  }

  return 0;
}
export function calculateChangeScore(
  priceScore: number,
  volumeScore: number,
  newsScore: number,
  earningsScore: number
): number {
  const score =
    priceScore * 0.4 +
    volumeScore * 0.25 +
    newsScore * 0.2 +
    earningsScore * 0.15;

  return Math.round(Math.min(Math.max(score, 0), 100));
}
export function getChangeSeverity(
  score: number
): "low" | "medium" | "high" | "critical" {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 60) {
    return "high";
  }

  if (score >= 30) {
    return "medium";
  }

  return "low";
}
export function generateChangeReasons(
  priceScore: number,
  volumeScore: number,
  newsScore: number,
  earningsScore: number
): string[] {
  const reasons: string[] = [];

  if (priceScore >= 70) {
    reasons.push(
      "Price movement is unusually large compared with recent volatility"
    );
  } else if (priceScore >= 40) {
    reasons.push(
      "Price movement is noticeable compared with recent volatility"
    );
  }

  if (volumeScore >= 70) {
    reasons.push(
      "Trading volume is significantly higher than normal"
    );
  } else if (volumeScore >= 40) {
    reasons.push(
      "Trading volume is elevated compared with normal activity"
    );
  }

  if (newsScore >= 70) {
    reasons.push(
      "Recent news activity is elevated"
    );
  } else if (newsScore >= 40) {
    reasons.push(
      "Recent news activity may be contributing to the change"
    );
  }

  if (earningsScore >= 70) {
    reasons.push(
      "An earnings event is approaching"
    );
  } else if (earningsScore >= 30) {
    reasons.push(
      "An upcoming earnings event may be relevant"
    );
  }

  if (reasons.length === 0) {
    reasons.push("No major changes detected");
  }

  return reasons;
}