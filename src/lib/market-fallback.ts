export type FallbackHistoryDay = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type FallbackEarnings = {
  symbol: string;
  reportDate: string;
  fiscalDateEnding: string;
  estimate: number | null;
  currency: string;
  timeOfTheDay?: string;
};

const aaplHistory: FallbackHistoryDay[] = [
  { date: "2026-09-03", open: 327.73, high: 328.93, low: 317.86, close: 321.19, volume: 45200000 },
  { date: "2026-09-02", open: 329.10, high: 331.20, low: 326.40, close: 328.21, volume: 38100000 },
  { date: "2026-09-01", open: 326.80, high: 330.40, low: 325.90, close: 329.50, volume: 36400000 },
  { date: "2026-08-31", open: 324.20, high: 327.60, low: 323.70, close: 326.90, volume: 35100000 },
  { date: "2026-08-28", open: 321.80, high: 325.30, low: 320.90, close: 324.70, volume: 34200000 },
  { date: "2026-08-27", open: 323.40, high: 324.80, low: 319.60, close: 321.20, volume: 33700000 },
  { date: "2026-08-26", open: 320.10, high: 323.90, low: 319.20, close: 322.80, volume: 32900000 },
  { date: "2026-08-25", open: 318.70, high: 321.50, low: 317.80, close: 320.40, volume: 31500000 },
  { date: "2026-08-24", open: 316.90, high: 319.80, low: 315.60, close: 318.20, volume: 30800000 },
  { date: "2026-08-21", open: 314.50, high: 318.20, low: 313.90, close: 317.60, volume: 30100000 },
  { date: "2026-08-20", open: 312.80, high: 315.90, low: 311.70, close: 314.20, volume: 29600000 },
  { date: "2026-08-19", open: 311.20, high: 314.40, low: 309.80, close: 312.90, volume: 28900000 },
  { date: "2026-08-18", open: 309.70, high: 312.60, low: 308.90, close: 311.40, volume: 28300000 },
  { date: "2026-08-17", open: 308.40, high: 311.10, low: 307.20, close: 309.80, volume: 27700000 },
  { date: "2026-08-14", open: 306.90, high: 309.80, low: 305.70, close: 308.60, volume: 27100000 },
  { date: "2026-08-13", open: 305.30, high: 308.20, low: 304.40, close: 307.10, volume: 26800000 },
  { date: "2026-08-12", open: 303.80, high: 306.70, low: 302.90, close: 305.90, volume: 26400000 },
  { date: "2026-08-11", open: 302.50, high: 305.40, low: 301.60, close: 304.20, volume: 25900000 },
  { date: "2026-08-10", open: 300.90, high: 303.80, low: 299.70, close: 302.80, volume: 25400000 },
  { date: "2026-08-07", open: 299.40, high: 302.10, low: 298.30, close: 301.20, volume: 24900000 },
  { date: "2026-08-06", open: 298.10, high: 300.80, low: 297.20, close: 299.60, volume: 24600000 },
];

export function getFallbackHistory(symbol: string): FallbackHistoryDay[] {
  if (symbol.toUpperCase() === "AAPL") {
    return aaplHistory;
  }

  return aaplHistory;
}

export function getFallbackEarnings(symbol: string): FallbackEarnings[] {
  if (symbol.toUpperCase() === "AAPL") {
    return [
      {
        symbol: "AAPL",
        reportDate: "2026-10-29",
        fiscalDateEnding: "2026-09-30",
        estimate: 1.98,
        currency: "USD",
        timeOfTheDay: "postmarket",
      },
    ];
  }

  return [];
}