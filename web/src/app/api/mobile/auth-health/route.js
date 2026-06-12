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
      const sessionCol = await admin.from(HANDOFF_TABLE).select("set_cookies").limit(0);
      checks.oauthHandoffSessionCookies = !sessionCol.error;
      if (sessionCol.error) {
        checks.oauthHandoffMigration =
          "Run: alter table public.torp_oauth_mobile_handoffs add column if not exists set_cookies text[] not null default '{}';";
      }
      const redirectCol = await admin.from(HANDOFF_TABLE).select("redirect_to").limit(0);
      checks.oauthHandoffRedirectTo = !redirectCol.error;
      if (redirectCol.error) {
        checks.oauthHandoffMigration =
          "Run: alter table public.torp_oauth_mobile_handoffs add column if not exists redirect_to text not null default '/';";
      }
      const probeKey = `__health_probe_${Date.now()}`;
      const probeExpires = new Date(Date.now() + 60_000).toISOString();
      const { error: probeErr } = await admin.from(HANDOFF_TABLE).upsert(
        {
          state_key: probeKey,
          set_cookies: ["__torp_authorize:probe"],
          redirect_to: "/",
          expires_at: probeExpires,
        },
        { onConflict: "state_key" },
      );
      checks.oauthHandoffAuthorizeUpsert = !probeErr;
      if (probeErr) {
        checks.oauthHandoffAuthorizeUpsertError = probeErr.message;
      } else {
        await admin.from(HANDOFF_TABLE).delete().eq("state_key", probeKey);
      }
    }
  } else {
    checks.oauthHandoffError = "supabase_admin_unavailable";
  }

  const ok =
    checks.workos &&
    checks.workosIssues.length === 0 &&
    checks.oauthHandoffTable &&
    checks.oauthHandoffAuthorizeUpsert !== false &&
    String(checks.redirectUri).includes("/callback");

  return NextResponse.json(
    { ok, checks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
