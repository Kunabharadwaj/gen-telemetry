import type { Generator } from "./schema";

const RATED_KW: Record<string, number> = { "GEN-01": 600, "GEN-02": 500, "GEN-03": 400, "GEN-04": 250 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, dp = 1) => Number(n.toFixed(dp));

export function initialGenerators(now = Date.now()): Generator[] {
  const base = { batteryV: 26.4, frequencyHz: 50, updatedAt: now };
  return [
    { ...base, id: "GEN-01", name: "Perth Depot A", site: "Perth, WA", status: "running", outputKw: 408, loadPct: 68, fuelPct: 82, coolantTempC: 78, runtimeHrs: 1204.5 },
    { ...base, id: "GEN-02", name: "Kalgoorlie Mine", site: "Kalgoorlie, WA", status: "running", outputKw: 300, loadPct: 60, fuelPct: 47, coolantTempC: 82, runtimeHrs: 5310.2 },
    { ...base, id: "GEN-03", name: "Fremantle Standby", site: "Fremantle, WA", status: "idle", outputKw: 0, loadPct: 0, fuelPct: 96, coolantTempC: 31, runtimeHrs: 212.8 },
    { ...base, id: "GEN-04", name: "Broome Pumping", site: "Broome, WA", status: "running", outputKw: 190, loadPct: 76, fuelPct: 14, coolantTempC: 88, runtimeHrs: 8890.1 },
  ];
}

/** One simulation tick: a bounded random walk around each generator's current state. */
export function stepGenerator(g: Generator, random: () => number = Math.random, now = Date.now()): Generator {
  const jitter = (range: number) => (random() - 0.5) * 2 * range;
  const rated = RATED_KW[g.id] ?? 300;

  if (g.status === "idle") {
    return { ...g, coolantTempC: round(clamp(g.coolantTempC + jitter(0.4), 25, 40)), updatedAt: now };
  }
  const loadPct = round(clamp(g.loadPct + jitter(3), 5, 100));
  const targetTemp = 65 + loadPct * 0.3;
  const coolantTempC = round(clamp(g.coolantTempC + (targetTemp - g.coolantTempC) * 0.1 + jitter(0.6), 40, 120));
  return {
    ...g,
    status: coolantTempC > 105 ? "alarm" : "running",
    loadPct,
    outputKw: round((loadPct / 100) * rated, 0),
    fuelPct: round(clamp(g.fuelPct - random() * 0.04, 0, 100), 2),
    coolantTempC,
    batteryV: round(26.4 + jitter(0.2), 2),
    frequencyHz: round(50 + jitter(0.1), 2),
    runtimeHrs: round(g.runtimeHrs + 1 / 3600, 4),
    updatedAt: now,
  };
}
