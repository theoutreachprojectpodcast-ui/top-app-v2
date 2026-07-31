/**
 * Non-secret production / preview build identity for diagnostics and smoke tests.
 * Never include API keys, cookie secrets, or service-role credentials.
 */

function trimEnv(name) {
  return String(process.env[name] || "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

function shortSha(sha) {
  const s = String(sha || "").trim();
  if (!s) return "";
  return s.length > 7 ? s.slice(0, 7) : s;
}

/**
 * @returns {{
 *   appVersion: string,
 *   environment: string,
 *   commitSha: string,
 *   commitShort: string,
 *   deploymentId: string,
 *   deploymentUrl: string,
 *   buildTimestamp: string,
 *   region: string,
 * }}
 */
export function getBuildIdentity() {
  const commitSha =
    trimEnv("VERCEL_GIT_COMMIT_SHA") ||
    trimEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA") ||
    trimEnv("GIT_COMMIT_SHA") ||
    "";
  const environment =
    trimEnv("VERCEL_ENV") ||
    trimEnv("NEXT_PUBLIC_VERCEL_ENV") ||
    (process.env.NODE_ENV === "production" ? "production" : "development");
  const deploymentId = trimEnv("VERCEL_DEPLOYMENT_ID") || trimEnv("NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID") || "";
  const deploymentUrl =
    trimEnv("VERCEL_URL") ||
    trimEnv("NEXT_PUBLIC_VERCEL_URL") ||
    "";
  const buildTimestamp =
    trimEnv("VERCEL_GIT_COMMIT_DATE") ||
    trimEnv("BUILD_TIMESTAMP") ||
    new Date().toISOString();

  const appVersion = trimEnv("NEXT_PUBLIC_APP_VERSION") || trimEnv("npm_package_version") || "0.1.0";

  return {
    appVersion,
    environment,
    commitSha,
    commitShort: shortSha(commitSha),
    deploymentId,
    deploymentUrl: deploymentUrl ? `https://${deploymentUrl.replace(/^https?:\/\//, "")}` : "",
    buildTimestamp,
    region: trimEnv("VERCEL_REGION") || "",
  };
}

/** Public subset safe for /api/health and response headers. */
export function getPublicBuildIdentity() {
  const full = getBuildIdentity();
  return {
    appVersion: full.appVersion,
    environment: full.environment,
    commitSha: full.commitSha,
    commitShort: full.commitShort,
    deploymentId: full.deploymentId,
    buildTimestamp: full.buildTimestamp,
  };
}

/** Header map for HTML / document responses (no secrets). */
export function buildIdentityHeaders(identity = getPublicBuildIdentity()) {
  const headers = {};
  if (identity.commitSha) headers["x-top-commit"] = identity.commitSha;
  if (identity.commitShort) headers["x-top-commit-short"] = identity.commitShort;
  if (identity.deploymentId) headers["x-top-deployment"] = identity.deploymentId;
  if (identity.environment) headers["x-top-env"] = identity.environment;
  if (identity.appVersion) headers["x-top-version"] = identity.appVersion;
  if (identity.buildTimestamp) headers["x-top-build-time"] = identity.buildTimestamp;
  return headers;
}
