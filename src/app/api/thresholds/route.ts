import { NextResponse } from "next/server";
import { DEFAULT_THRESHOLDS, thresholdsSchema, type Thresholds } from "@/lib/schema";

export const dynamic = "force-dynamic";

// In-memory store: resets on restart, which is fine for a mock backend.
let current: Thresholds = DEFAULT_THRESHOLDS;

export function GET() {
  return NextResponse.json(current);
}

export async function POST(request: Request) {
  const parsed = thresholdsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid thresholds", issues: parsed.error.issues }, { status: 400 });
  current = parsed.data;
  return NextResponse.json(current);
}
