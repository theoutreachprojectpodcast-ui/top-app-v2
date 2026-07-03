import { NextResponse } from "next/server";
import { buildDbHealth } from "@/lib/runtime/productionHealth";

export const dynamic = "force-dynamic";

/** GET — Supabase connectivity health (no secrets). */
export async function GET() {
  const body = await buildDbHealth();
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
