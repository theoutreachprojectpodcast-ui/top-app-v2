import { isWorkOSConfigured, workOSEnvironmentIssues } from "@/lib/auth/workosConfigured";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildStripeHealthSummary,
  environmentValidationIssues,
} from "@/lib/runtime/environmentConfig";
import {
  authCallbackUrl,
  deploymentProfile,
  mobileWebEntryUrl,
  webBaseUrl,
} from "@/lib/runtime/appUrls";

const HANDOFF_TABLE = "torp_oauth_mobile_handoffs";

export function buildAuthHealth() {
  const issues = workOSEnvironmentIssues();
  return {
    ok: isWorkOSConfigured(),
    workos: isWorkOSConfigured(),
    issues,
    redirectUri: authCallbackUrl(),
    cookieDomain: String(process.env.WORKOS_COOKIE_DOMAIN || "").trim() || null,
  };
}

export async function buildDbHealth() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, supabaseAdmin: false, error: "supabase_admin_unavailable" };
  }
  const { error } = await admin.from(HANDOFF_TABLE).select("state_key").limit(1);
  return {
    ok: !error,
    supabaseAdmin: true,
    oauthHandoffTable: !error,
    error: error?.message || null,
  };
}

export function buildEnvHealth() {
  const issues = environmentValidationIssues();
  return {
    ok: issues.length === 0,
    profile: deploymentProfile(),
    canonicalOrigin: webBaseUrl(),
    issues,
    vercelEnv: String(process.env.VERCEL_ENV || "").trim() || null,
  };
}

export function buildStripeHealth() {
  return buildStripeHealthSummary();
}

export function buildMobileHealth() {
  const origin = mobileWebEntryUrl();
  return {
    ok: origin.startsWith("https://") && !origin.includes("localhost"),
    embeddedCapacitorTarget: origin,
    authStartPath: "/mobile/auth/start",
    postLoginPath: "/mobile/auth/complete",
    bundleId: "com.theoutreachproject.theoutreachproject",
  };
}

export async function buildFullProductionHealth() {
  const auth = buildAuthHealth();
  const db = await buildDbHealth();
  const env = buildEnvHealth();
  const mobile = buildMobileHealth();
  const stripe = buildStripeHealth();

  const ok = auth.ok && db.ok && env.ok && mobile.ok && stripe.ok;

  return {
    ok,
    service: "theoutreachproject",
    canonicalOrigin: webBaseUrl(),
    profile: deploymentProfile(),
    workos: auth.workos,
    workosIssues: auth.issues,
    stripe: stripe.ok,
    stripeMode: stripe.mode,
    supabaseAdmin: db.supabaseAdmin,
    oauthHandoffTable: db.oauthHandoffTable,
    timestamp: new Date().toISOString(),
    checks: { auth, db, env, mobile, stripe },
  };
}
