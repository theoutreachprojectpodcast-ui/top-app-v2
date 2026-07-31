import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const commitSha = String(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "").trim();
const deploymentId = String(process.env.VERCEL_DEPLOYMENT_ID || "").trim();
const vercelEnv = String(process.env.VERCEL_ENV || "").trim();
const appVersion = String(pkg.version || "0.1.0");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inlined at build so client code can mirror server `VERCEL_ENV` (not available in the browser otherwise).
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || "",
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL || "",
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: commitSha,
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: deploymentId,
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  // pnpm stores `next` under the monorepo root `.pnpm` store. Turbopack must use that
  // root or it treats `src/app` as the project dir and panics ("Next.js package not found").
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  async headers() {
    const buildHeaders = [];
    if (commitSha) buildHeaders.push({ key: "x-top-commit", value: commitSha });
    if (commitSha) buildHeaders.push({ key: "x-top-commit-short", value: commitSha.slice(0, 7) });
    if (deploymentId) buildHeaders.push({ key: "x-top-deployment", value: deploymentId });
    if (vercelEnv) buildHeaders.push({ key: "x-top-env", value: vercelEnv });
    if (appVersion) buildHeaders.push({ key: "x-top-version", value: appVersion });

    return [
      {
        // Browser HTML documents: revalidate every request; do not pin an obsolete shell.
        source: "/:path((?!_next|api|.*\\..*).*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          ...buildHeaders,
        ],
      },
      {
        // Capacitor WebView: never cache HTML shells across native sessions.
        source: "/:path((?!_next|api|.*\\..*).*)",
        has: [{ type: "header", key: "user-agent", value: ".*TheOutreachProject/Capacitor.*" }],
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          ...buildHeaders,
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/icon-:size(192|512|1024).png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
