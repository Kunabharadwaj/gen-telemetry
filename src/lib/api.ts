import { z } from "zod";
import { generatorSchema, thresholdsSchema, type Thresholds } from "./schema";

// Node's fetch (tests, SSR) needs absolute URLs; browsers accept relative ones.
const url = (path: string) => (typeof window === "undefined" ? path : new URL(path, window.location.origin).href);

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url(path), { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return schema.parse(await res.json());
}

export const fetchGenerators = () => getJson("/api/generators", z.array(generatorSchema));
export const fetchThresholds = () => getJson("/api/thresholds", thresholdsSchema);

export async function saveThresholds(t: Thresholds): Promise<Thresholds> {
  const res = await fetch(url("/api/thresholds"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(t),
  });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
  return thresholdsSchema.parse(await res.json());
}
