import { billingCapabilitiesPayload } from "@/lib/billing/billingCapabilitiesPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(billingCapabilitiesPayload(), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (e) {
    console.error("[torp] billing capabilities", e);
    return Response.json(
      { ok: false, error: "capabilities_failed", message: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
