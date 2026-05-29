/**
 * Detects The Outreach Project QA / staging-style deployments (Vercel hostnames + configured public URL).
 * Used to enable demo auth and optional QA-only admin allowlists without treating all production as QA.
 *
 * Client bundle: relies on `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_VERCEL_URL` (see `next.config.mjs`).
 * Server: also considers `APP_BASE_URL` and `VERCEL_URL`.
 */

const MARKERS = [
  "https://qa-the-outreach-project.vercel.app/",
  "qa-the-outreach-project.vercel.app",
  "the-outreach-project-app-git-qa",
  "-git-qa-the-outreach-project",
  "qa.theoutreachproject.app",
  "admin-qa.theoutreachproject.app",
];

function collectUrlBlob() {
  const parts = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL,
  ]
    .map((s) => String(s || "").trim().toLowerCase())
    .filter(Boolean);
  return parts.join(" ");
}

/**
 * @returns {boolean}
 */
export function isQaDeploymentContext() {
  const blob = collectUrlBlob();
  if (!blob) return false;
  return MARKERS.some((m) => blob.includes(m));
}
