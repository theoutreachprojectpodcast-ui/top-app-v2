import { NextResponse } from "next/server";
import { buildAuthHealth } from "@/lib/runtime/productionHealth";

export const dynamic = "force-dynamic";

/** GET — WorkOS / auth configuration health (no secrets). */
export async function GET() {
  const body = buildAuthHealth();
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
