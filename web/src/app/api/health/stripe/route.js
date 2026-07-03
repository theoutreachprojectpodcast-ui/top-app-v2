import { NextResponse } from "next/server";
import { buildStripeHealthSummary } from "@/lib/runtime/environmentConfig";

export const dynamic = "force-dynamic";

/** GET — Stripe configuration health (mode, price IDs present, no secrets). */
export async function GET() {
  const body = buildStripeHealthSummary();
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
