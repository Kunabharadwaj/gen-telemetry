import { z } from "zod";

export const generatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  site: z.string(),
  status: z.enum(["running", "idle", "alarm"]),
  outputKw: z.number(),
  loadPct: z.number(),
  fuelPct: z.number(),
  coolantTempC: z.number(),
  batteryV: z.number(),
  frequencyHz: z.number(),
  runtimeHrs: z.number(),
  updatedAt: z.number(),
});
export type Generator = z.infer<typeof generatorSchema>;

export const feedMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot"), data: z.array(generatorSchema) }),
  z.object({ type: z.literal("telemetry"), data: generatorSchema }),
]);
export type FeedMessage = z.infer<typeof feedMessageSchema>;

const num = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} must be a number` })
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

export const thresholdsSchema = z.object({
  maxCoolantTempC: num("Max coolant temp", 60, 120),
  minFuelPct: num("Min fuel", 0, 100),
  maxLoadPct: num("Max load", 50, 110),
});
export type Thresholds = z.infer<typeof thresholdsSchema>;

export const DEFAULT_THRESHOLDS: Thresholds = { maxCoolantTempC: 95, minFuelPct: 15, maxLoadPct: 90 };
