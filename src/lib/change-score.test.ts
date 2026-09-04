import { describe, test, expect } from "vitest";

import {
  calculateDailyReturns,
  calculateStandardDeviation,
  calculatePriceAnomalyScore,
  calculateVolumeAnomalyScore,
  getRecentValues,
  calculateNewsImpactScore,
  calculateEarningsImpactScore,
} from "./change-score";

describe("Change Score calculations", () => {
  test("calculates daily returns", () => {
    const prices = [100, 102, 101];

    const returns = calculateDailyReturns(prices);

    expect(returns[0]).toBeCloseTo(2);
    expect(returns[1]).toBeCloseTo(-0.9804, 3);
  });

  test("calculates standard deviation", () => {
    const values = [1, 2, 3];

    const standardDeviation =
      calculateStandardDeviation(values);

    expect(standardDeviation).toBeCloseTo(0.8165, 3);
  });

  test("returns zero when there is not enough history", () => {
    const score = calculatePriceAnomalyScore(
      3,
      [1, -1, 0]
    );

    expect(score).toBe(0);
  });

  test("large movement gets a high anomaly score", () => {
    const historicalReturns = [
      1,
      -1,
      0.5,
      -0.5,
      1,
      -1,
      0.5,
      -0.5,
    ];

    const score = calculatePriceAnomalyScore(
      3,
      historicalReturns
    );

    expect(score).toBeGreaterThan(80);
  });
    test("normal volume gets a low anomaly score", () => {
    const score = calculateVolumeAnomalyScore(
      100,
      [100, 100, 100, 100, 100]
    );

    expect(score).toBe(0);
  });

  test("double normal volume gets a moderate anomaly score", () => {
    const score = calculateVolumeAnomalyScore(
      200,
      [100, 100, 100, 100, 100]
    );

    expect(score).toBe(50);
  });

  test("triple normal volume gets a high anomaly score", () => {
    const score = calculateVolumeAnomalyScore(
      300,
      [100, 100, 100, 100, 100]
    );

    expect(score).toBe(100);
  });
  test("gets the most recent values", () => {
  const values = [100, 90, 80, 70, 60];

  const recent = getRecentValues(values, 3);

  expect(recent).toEqual([100, 90, 80]);
});
test("no news gets zero impact", () => {
  const score = calculateNewsImpactScore(0, 2);

  expect(score).toBe(0);
});
test("recent news gets a meaningful score", () => {
  const score = calculateNewsImpactScore(1, 2);

  expect(score).toBe(65);
});

test("multiple recent articles get a high score", () => {
  const score = calculateNewsImpactScore(5, 2);

  expect(score).toBe(85);
});

test("older news gets less impact", () => {
  const score = calculateNewsImpactScore(1, 48);

  expect(score).toBe(5);
});
test("earnings tomorrow gets maximum impact", () => {
  const score = calculateEarningsImpactScore(1);

  expect(score).toBe(100);
});

test("earnings within three days gets high impact", () => {
  const score = calculateEarningsImpactScore(3);

  expect(score).toBe(80);
});

test("earnings within seven days gets moderate impact", () => {
  const score = calculateEarningsImpactScore(7);

  expect(score).toBe(60);
});

test("earnings far in the future gets low impact", () => {
  const score = calculateEarningsImpactScore(30);

  expect(score).toBe(15);
});

test("past earnings gets zero impact", () => {
  const score = calculateEarningsImpactScore(-1);

  expect(score).toBe(0);
});
});