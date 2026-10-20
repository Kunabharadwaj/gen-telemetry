import type { Generator, Thresholds } from "./schema";

/** Newest-wins merge so a slow REST snapshot never overwrites fresher websocket data. */
export function mergeGenerators(existing: Generator[] | undefined, incoming: Generator[]): Generator[] {
  const byId = new Map((existing ?? []).map((g) => [g.id, g]));
  for (const g of incoming) {
    const current = byId.get(g.id);
    if (!current || g.updatedAt >= current.updatedAt) byId.set(g.id, g);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function evaluateAlerts(g: Generator, t: Thresholds): string[] {
  const alerts: string[] = [];
  if (g.coolantTempC > t.maxCoolantTempC) alerts.push("High coolant temp");
  if (g.fuelPct < t.minFuelPct) alerts.push("Low fuel");
  if (g.loadPct > t.maxLoadPct) alerts.push("High load");
  return alerts;
}

export function formatAgo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 2) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ${s % 60}s ago`;
}
