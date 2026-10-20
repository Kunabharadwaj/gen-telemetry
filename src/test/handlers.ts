import { http, HttpResponse } from "msw";
import { initialGenerators } from "@/lib/simulator";
import { DEFAULT_THRESHOLDS } from "@/lib/schema";

export const handlers = [
  http.get("/api/generators", () => HttpResponse.json(initialGenerators(1_000))),
  http.get("/api/thresholds", () => HttpResponse.json(DEFAULT_THRESHOLDS)),
  http.post("/api/thresholds", async ({ request }) => HttpResponse.json(await request.json())),
];
