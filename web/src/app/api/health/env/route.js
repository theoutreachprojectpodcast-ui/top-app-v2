import { NextResponse } from "next/server";
import { buildEnvHealth } from "@/lib/runtime/productionHealth";

export const dynamic = "force-dynamic";

/** GET — deployment URL / env profile health (no secrets). */
export async function GET() {
  const body = buildEnvHealth();
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
