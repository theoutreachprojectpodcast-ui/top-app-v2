import { NextResponse } from "next/server";
import { isWorkOSConfigured, workOSEnvironmentIssues } from "@/lib/auth/workosConfigured";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const HANDOFF_TABLE = "torp_oauth_mobile_handoffs";

/**
 * GET — mobile auth readiness (no secrets). Used by mobile:preflight and release checklists.
 */
export async function GET() {
  const origin = String(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://theoutreachproject.app",
  )
    .trim()
    .replace(/\/$/, "");

  const checks = {
    workos: isWorkOSConfigured(),
    workosIssues: workOSEnvironmentIssues(),
    redirectUri:
      String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "").trim() ||
      `${origin}/callback`,
    cookieDomain: String(process.env.WORKOS_COOKIE_DOMAIN || "").trim() || null,
    oauthHandoffTable: false,
    embeddedCapacitorTarget: `${origin}/mobile`,
  };

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from(HANDOFF_TABLE).select("state_key").limit(1);
    checks.oauthHandoffTable = !error;
    if (error) {
      checks.oauthHandoffError = error.message;
    } else {
      const sessionCol = await admin.from(HANDOFF_TABLE).select("session_cookies").limit(0);
      checks.oauthHandoffSessionCookies = !sessionCol.error;
      if (sessionCol.error) {
        checks.oauthHandoffMigration =
          "Run: alter table public.torp_oauth_mobile_handoffs add column if not exists session_cookies text[];";
      }
    }
  } else {
    checks.oauthHandoffError = "supabase_admin_unavailable";
  }

  const ok =
    checks.workos &&
    checks.workosIssues.length === 0 &&
    checks.oauthHandoffTable &&
    String(checks.redirectUri).includes("/callback");

  return NextResponse.json(
    { ok, checks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
