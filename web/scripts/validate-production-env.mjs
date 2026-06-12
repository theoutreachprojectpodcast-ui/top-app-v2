const strictArg = process.argv.includes("--strict");
const vercel = process.env.VERCEL === "1";
const vercelEnv = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
const vercelProduction = vercel && vercelEnv === "production";
const enforce =
  strictArg ||
  process.env.TOP_VALIDATE_ENV === "1" ||
  (process.env.CI === "true" && !vercel) ||
  vercelProduction;

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
];

const missing = requiredKeys.filter((key) => !String(process.env[key] || "").trim());

const appUrl = String(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().toLowerCase();
const isProdLikeHost = appUrl.startsWith("https://") && !appUrl.includes("localhost");
const cookieDomain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
const isVercelPreview = vercel && vercelEnv === "preview";
const isGithubCiBuild = process.env.CI === "true" && !vercel;
const adminEmailLoginProd = ["1", "true"].includes(
  String(process.env.ENABLE_ADMIN_EMAIL_LOGIN || "").trim().toLowerCase(),
);
// Cookie domain is for apex/subdomain session sharing on the real prod host; preview URLs are a single *.vercel.app host.
if (isProdLikeHost && !cookieDomain && !isVercelPreview && !isGithubCiBuild) {
  missing.push("WORKOS_COOKIE_DOMAIN");
}
if (vercelProduction && adminEmailLoginProd && !cookieDomain) {
  missing.push("WORKOS_COOKIE_DOMAIN (required for admin email login on apex + admin host)");
}

if (vercelProduction) {
  const appUrlCheck = String(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase();
  if (appUrlCheck.includes("outreachproject.app") && !appUrlCheck.includes("theoutreachproject.app")) {
    console.error(
      "[validate-production-env] APP_BASE_URL uses outreachproject.app — production domain is theoutreachproject.app",
    );
    process.exit(1);
  }
  if (!String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "").includes("/callback")) {
    missing.push("WORKOS redirect URI must end with /callback");
  }
}

if (vercelProduction) {
  if (!String(process.env.STRIPE_SECRET_KEY || "").trim()) {
    missing.push("STRIPE_SECRET_KEY");
  }
  const hasWebhook =
    String(process.env.STRIPE_WEBHOOK_LIVE_SECRET || "").trim() ||
    String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!hasWebhook) {
    missing.push("STRIPE_WEBHOOK_LIVE_SECRET or STRIPE_WEBHOOK_SECRET");
  }
  if (adminEmailLoginProd) {
    console.warn(
      "[validate-production-env] WARNING: ENABLE_ADMIN_EMAIL_LOGIN=1 on production — prefer WorkOS-only admin auth.",
    );
  }
}

const privateRedirect = String(process.env.WORKOS_REDIRECT_URI || "").trim();
const publicRedirect = String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "").trim();
if (!privateRedirect && !publicRedirect) {
  missing.push("WORKOS_REDIRECT_URI or NEXT_PUBLIC_WORKOS_REDIRECT_URI");
}

if (!String(process.env.APP_BASE_URL || "").trim() && !String(process.env.NEXT_PUBLIC_APP_URL || "").trim()) {
  missing.push("APP_BASE_URL or NEXT_PUBLIC_APP_URL");
}

if (!enforce) {
  if (missing.length) {
    console.warn("[validate-production-env] Skipping strict check outside CI/Vercel.");
    console.warn(`[validate-production-env] Missing keys (for production deploy): ${missing.join(", ")}`);
  }
  process.exit(0);
}

if (missing.length) {
  console.error("[validate-production-env] Missing required production environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

/** Vercel Production must use the WorkOS *Production* dashboard keys (`sk_live_…`), not Staging (`sk_test_…`). */
const workosKey = String(process.env.WORKOS_API_KEY || "").trim();
if (vercelProduction && workosKey.startsWith("sk_test_")) {
  console.error(
    "[validate-production-env] Vercel Production is configured with a WorkOS Staging API key (sk_test_…).",
  );
  console.error(
    "Use WorkOS Dashboard → switch environment to Production → API Keys → copy sk_live_… and client_… for Production.",
  );
  console.error(
    "Register the production Redirect URI (e.g. https://theoutreachproject.app/callback) under that Production environment.",
  );
  process.exit(1);
}

console.log("[validate-production-env] Required production variables are set.");
