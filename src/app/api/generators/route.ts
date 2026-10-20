import { NextResponse } from "next/server";
import { initialGenerators } from "@/lib/simulator";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(initialGenerators());
}
