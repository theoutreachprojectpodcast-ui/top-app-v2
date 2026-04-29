import { access, readFile } from "node:fs/promises";
import path from "node:path";

const requiredFiles = [
  "src/proxy.js",
  "src/app/callback/route.js",
  "src/app/sign-out/route.js",
  "src/app/api/auth/workos/signin/route.js",
  "src/app/api/auth/workos/signup/route.js",
  "src/app/api/me/route.js",
  "src/lib/auth/workosConfigured.js",
  "src/lib/auth/workosRouteAuth.js",
  "src/lib/auth/workosOrganizationScope.js",
  "src/lib/auth/sessionIdle.js",
];

const requiredEnvExamples = [
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_COOKIE_PASSWORD",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
  "WORKOS_ORGANIZATION_ID",
  "TOP_SESSION_IDLE_MS",
  "APP_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
];

const missingFiles = [];
for (const rel of requiredFiles) {
  try {
    await access(path.resolve(process.cwd(), rel));
  } catch {
    missingFiles.push(rel);
  }
}

if (missingFiles.length) {
  console.error("[verify:workos-auth] Missing required auth files:");
  for (const item of missingFiles) console.error(`- ${item}`);
  process.exit(1);
}

const envExamplePath = path.resolve(process.cwd(), ".env.example");
const envExample = await readFile(envExamplePath, "utf8");
const missingEnvKeys = requiredEnvExamples.filter((k) => !envExample.includes(`${k}=`));

if (missingEnvKeys.length) {
  console.error("[verify:workos-auth] .env.example missing required keys:");
  for (const key of missingEnvKeys) console.error(`- ${key}`);
  process.exit(1);
}

console.log("[verify:workos-auth] OK (routes + .env.example auth keys present)");
