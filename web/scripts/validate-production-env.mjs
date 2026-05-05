const strictArg = process.argv.includes("--strict");
const enforce =
  strictArg ||
  process.env.TOP_VALIDATE_ENV === "1" ||
  process.env.CI === "true" ||
  process.env.VERCEL === "1";

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
];

const missing = requiredKeys.filter((key) => !String(process.env[key] || "").trim());

const appUrl = String(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().toLowerCase();
const isProdLikeHost = appUrl.startsWith("https://") && !appUrl.includes("localhost");
const cookieDomain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
if (isProdLikeHost && !cookieDomain) {
  missing.push("WORKOS_COOKIE_DOMAIN");
}

const privateRedirect = String(process.env.WORKOS_REDIRECT_URI || "").trim();
const publicRedirect = String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "").trim();
if (!privateRedirect && !publicRedirect) {
  missing.push("WORKOS_REDIRECT_URI or NEXT_PUBLIC_WORKOS_REDIRECT_URI");
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
const vercelProduction = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
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
