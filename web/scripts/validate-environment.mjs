/**
 * Unified environment validation for local, QA, preview, production, and mobile/TestFlight builds.
 *
 * Usage:
 *   node scripts/validate-environment.mjs --profile production
 *   node scripts/validate-environment.mjs --profile qa --strict
 *   node scripts/validate-environment.mjs --profile mobile
 */
const args = process.argv.slice(2);
const profileArg = args.find((a) => a.startsWith("--profile="))?.split("=")[1]
  || (args.includes("--profile") ? args[args.indexOf("--profile") + 1] : null);
const strict = args.includes("--strict") || process.env.TOP_VALIDATE_ENV === "1";

const vercel = process.env.VERCEL === "1";
const vercelEnv = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
const vercelProduction = vercel && vercelEnv === "production";
const vercelPreview = vercel && vercelEnv === "preview";

function inferProfile() {
  if (profileArg) return profileArg.toLowerCase();
  if (vercelProduction) return "production";
  if (vercelPreview) return "preview";
  const appUrl = String(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase();
  if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) return "local";
  if (appUrl.includes("qa.") || appUrl.includes("-git-qa") || appUrl.includes("qa-the-outreach-project")) return "qa";
  return "production";
}

const profile = inferProfile();
const enforce =
  strict ||
  vercelProduction ||
  (process.env.CI === "true" && profile !== "local") ||
  args.includes("--enforce");

const PRODUCTION_HOST = "theoutreachproject.app";
const QA_HOSTS = ["qa.theoutreachproject.app", "qa-the-outreach-project.vercel.app"];
const PREVIEW_MARKERS = ["vercel.app", "127.0.0.1", "localhost"];

const requiredBase = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
];

const issues = [];
const warnings = [];

function appUrl() {
  return String(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
}

function redirectUri() {
  return String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "").trim();
}

function stripeMode() {
  const key = String(process.env.STRIPE_SECRET_KEY || "");
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unknown";
}

function pushMissing(keys) {
  for (const key of keys) {
    if (!String(process.env[key] || "").trim()) issues.push(`Missing ${key}`);
  }
}

// --- Base requirements ---
if (profile !== "local") {
  pushMissing(requiredBase);
  if (!appUrl()) issues.push("Missing APP_BASE_URL or NEXT_PUBLIC_APP_URL");
  if (!redirectUri()) issues.push("Missing WORKOS_REDIRECT_URI or NEXT_PUBLIC_WORKOS_REDIRECT_URI");
}

// --- Profile-specific ---
if (profile === "production") {
  const url = appUrl().toLowerCase();
  if (!url.includes(PRODUCTION_HOST)) {
    issues.push(`APP_BASE_URL must use ${PRODUCTION_HOST} in production (got ${appUrl() || "unset"})`);
  }
  if (PREVIEW_MARKERS.some((m) => url.includes(m) && !url.includes(PRODUCTION_HOST))) {
    issues.push("APP_BASE_URL must not use localhost or preview hostname in production");
  }
  if (url.includes("outreachproject.app") && !url.includes(PRODUCTION_HOST)) {
    issues.push("APP_BASE_URL uses invalid outreachproject.app — use theoutreachproject.app");
  }
  if (!String(process.env.WORKOS_COOKIE_DOMAIN || "").trim()) {
    issues.push("Missing WORKOS_COOKIE_DOMAIN for production");
  }
  if (!String(process.env.STRIPE_SECRET_KEY || "").trim()) issues.push("Missing STRIPE_SECRET_KEY");
  const webhook =
    process.env.STRIPE_WEBHOOK_LIVE_SECRET?.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhook) issues.push("Missing STRIPE_WEBHOOK_LIVE_SECRET or STRIPE_WEBHOOK_SECRET");
  if (stripeMode() !== "live") issues.push("STRIPE_SECRET_KEY must be sk_live_ in production");
  const workosKey = String(process.env.WORKOS_API_KEY || "");
  if (workosKey.startsWith("sk_test_")) issues.push("WORKOS_API_KEY must be sk_live_ in production");
  const redir = redirectUri().toLowerCase();
  if (redir && !redir.includes(PRODUCTION_HOST)) {
    issues.push("WorkOS redirect URI must use production apex host");
  }
  if (String(process.env.NEXT_PUBLIC_ENABLE_DEMO_FLOWS || "0") === "1") {
    warnings.push("NEXT_PUBLIC_ENABLE_DEMO_FLOWS=1 on production — should be 0");
  }
}

if (profile === "qa" || profile === "preview") {
  const url = appUrl().toLowerCase();
  if (profile === "qa" && url && !QA_HOSTS.some((h) => url.includes(h)) && !url.includes("-git-qa")) {
    warnings.push(`QA APP_BASE_URL (${appUrl()}) is not a known QA hostname — verify Vercel branch mapping`);
  }
  if (stripeMode() === "live") {
    issues.push("QA must use Stripe test keys (sk_test_), not live keys");
  }
  if (!String(process.env.STRIPE_SECRET_KEY || "").trim()) {
    warnings.push("STRIPE_SECRET_KEY unset — billing flows will be disabled in QA");
  }
  const qaWebhook =
    process.env.STRIPE_WEBHOOK_TEST_SECRET?.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!qaWebhook) {
    warnings.push("STRIPE_WEBHOOK_TEST_SECRET or STRIPE_WEBHOOK_SECRET unset — webhook tests will fail");
  }
}

if (profile === "mobile") {
  const capUrl = String(
    process.env.CAP_SERVER_URL || process.env.MOBILE_PRODUCTION_URL || "",
  ).trim();
  const target = capUrl || "https://theoutreachproject.app";
  const lower = target.toLowerCase();
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) {
    issues.push(`CAP_SERVER_URL must not point at localhost for mobile/TestFlight (got ${target})`);
  }
  if (lower.includes("qa.") || lower.includes("-git-qa") || lower.includes("preview")) {
    issues.push(`CAP_SERVER_URL must not point at QA/preview for production mobile builds (got ${target})`);
  }
  if (!lower.includes(PRODUCTION_HOST)) {
    issues.push(`CAP_SERVER_URL must use ${PRODUCTION_HOST} for production mobile builds`);
  }
}

if (profile === "local") {
  if (!appUrl()) warnings.push("APP_BASE_URL unset — defaulting to localhost in dev");
}

// --- Output ---
console.log(`[validate-environment] profile=${profile} enforce=${enforce}`);

if (warnings.length) {
  for (const w of warnings) console.warn(`[validate-environment] WARN ${w}`);
}

if (!enforce) {
  if (issues.length) {
    console.warn(`[validate-environment] Skipping strict check (use --strict or deploy to Vercel Production)`);
    for (const i of issues) console.warn(`[validate-environment] Would fail: ${i}`);
  } else {
    console.log("[validate-environment] OK (non-strict)");
  }
  process.exit(0);
}

if (issues.length) {
  console.error("[validate-environment] Validation failed:");
  for (const i of issues) console.error(`- ${i}`);
  process.exit(1);
}

console.log("[validate-environment] All checks passed.");
