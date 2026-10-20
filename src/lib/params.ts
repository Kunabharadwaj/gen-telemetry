import { z } from "zod";

export const scenarioSchema = z.enum(["normal", "flaky", "stall", "down"]);
export type Scenario = z.infer<typeof scenarioSchema>;

const int = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).catch(fallback);

/** Demo/test knobs read from the URL; anything invalid falls back to a default. */
export const dashboardParamsSchema = z.object({
  scenario: scenarioSchema.catch("normal"),
  maxAttempts: int(0, 10, 5),
  baseDelayMs: int(50, 10_000, 1000),
  staleAfterMs: int(1000, 120_000, 5000),
});
export type DashboardParams = z.infer<typeof dashboardParamsSchema>;

export function parseDashboardParams(raw: Record<string, string | string[] | undefined>): DashboardParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return dashboardParamsSchema.parse({
    scenario: first(raw.scenario),
    maxAttempts: first(raw.retries),
    baseDelayMs: first(raw.backoff),
    staleAfterMs: first(raw.staleAfter),
  });
}
