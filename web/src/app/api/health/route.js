import { NextResponse } from "next/server";
import { isWorkOSConfigured, workOSEnvironmentIssues } from "@/lib/auth/workosConfigured";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripeSecretConfigured } from "@/lib/billing/stripeConfig";

const HANDOFF_TABLE = "torp_oauth_mobile_handoffs";

/**
 * GET — lightweight production health (no secrets). Used by uptime checks and release validation.
 */
export async function GET() {
  const origin = String(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://theoutreachproject.app",
  )
    .trim()
    .replace(/\/$/, "");

  const checks = {
    ok: true,
    service: "theoutreachproject",
    canonicalOrigin: origin,
    workos: isWorkOSConfigured(),
    workosIssues: workOSEnvironmentIssues(),
    stripe: stripeSecretConfigured(),
    supabaseAdmin: false,
    oauthHandoffTable: false,
    timestamp: new Date().toISOString(),
  };

  const admin = createSupabaseAdminClient();
  if (admin) {
    checks.supabaseAdmin = true;
    const { error } = await admin.from(HANDOFF_TABLE).select("state_key").limit(1);
    checks.oauthHandoffTable = !error;
    if (error) checks.oauthHandoffError = error.message;
  } else {
    checks.supabaseAdminError = "supabase_admin_unavailable";
  }

  checks.ok =
    checks.workos &&
    checks.workosIssues.length === 0 &&
    checks.supabaseAdmin &&
    checks.oauthHandoffTable;

  return NextResponse.json(checks, {
    status: checks.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
