/**
 * Demo-only flows (local email/password sign-in, demo payment UX, etc.).
 *
 * - Explicit: `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=1|0|true|false` always wins.
 * - Vercel Preview (e.g. QA branch deploys): on by default so https://…-git-qa-….vercel.app can use demo auth
 *   without a manual env toggle. Set `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0` on Preview to disable.
 * - Vercel Production: off unless `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=1`.
 * - Local dev: on when `NODE_ENV !== "production"`.
 */
export function isDemoModeEnabled() {
  const explicit = String(process.env.NEXT_PUBLIC_ENABLE_DEMO_FLOWS || "").trim();
  if (explicit === "1" || explicit.toLowerCase() === "true") return true;
  if (explicit === "0" || explicit.toLowerCase() === "false") return false;
  const vercelEnv = String(
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || "",
  )
    .trim()
    .toLowerCase();
  if (vercelEnv === "preview") return true;
  return process.env.NODE_ENV !== "production";
}
