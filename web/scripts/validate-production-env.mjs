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
  "WORKOS_COOKIE_DOMAIN",
  "WORKOS_REDIRECT_URI",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
];

const missing = requiredKeys.filter((key) => !String(process.env[key] || "").trim());

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

console.log("[validate-production-env] Required production variables are set.");
