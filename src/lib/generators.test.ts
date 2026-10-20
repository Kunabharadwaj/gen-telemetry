import { describe, expect, it } from "vitest";
import { evaluateAlerts, formatAgo, mergeGenerators } from "./generators";
import { parseDashboardParams } from "./params";
import { DEFAULT_THRESHOLDS } from "./schema";
import { initialGenerators } from "./simulator";

const [a, b] = initialGenerators(1000);

describe("mergeGenerators", () => {
  it("keeps the newer record per id", () => {
    const merged = mergeGenerators([{ ...a, updatedAt: 2000, loadPct: 10 }], [{ ...a, updatedAt: 1000, loadPct: 99 }, b]);
    expect(merged.find((g) => g.id === a.id)?.loadPct).toBe(10);
    expect(merged).toHaveLength(2);
  });
  it("handles an empty cache", () => {
    expect(mergeGenerators(undefined, [b, a]).map((g) => g.id)).toEqual([a.id, b.id]);
  });
});

describe("evaluateAlerts", () => {
  it("flags low fuel, high temp and high load", () => {
    expect(evaluateAlerts({ ...a, fuelPct: 5, coolantTempC: 100, loadPct: 95 }, DEFAULT_THRESHOLDS)).toEqual(["High coolant temp", "Low fuel", "High load"]);
    expect(evaluateAlerts(a, DEFAULT_THRESHOLDS)).toEqual([]);
  });
});

describe("formatAgo", () => {
  it.each([[500, "just now"], [5000, "5s ago"], [65_000, "1m 5s ago"]])("%ims -> %s", (ms, out) => expect(formatAgo(ms)).toBe(out));
});

describe("parseDashboardParams", () => {
  it("applies defaults for missing or invalid values", () => {
    expect(parseDashboardParams({ scenario: "bogus", retries: "abc" })).toEqual({ scenario: "normal", maxAttempts: 5, baseDelayMs: 1000, staleAfterMs: 5000 });
  });
  it("reads valid values", () => {
    expect(parseDashboardParams({ scenario: "down", retries: "2", backoff: "100" })).toMatchObject({ scenario: "down", maxAttempts: 2, baseDelayMs: 100 });
  });
});
