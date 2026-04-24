/**
 * Demo-only flows are useful locally, but should be off in QA/production.
 * Override with NEXT_PUBLIC_ENABLE_DEMO_FLOWS=1 only for explicit local testing.
 */
export function isDemoModeEnabled() {
  const explicit = String(process.env.NEXT_PUBLIC_ENABLE_DEMO_FLOWS || "").trim();
  if (explicit === "1" || explicit.toLowerCase() === "true") return true;
  if (explicit === "0" || explicit.toLowerCase() === "false") return false;
  return process.env.NODE_ENV !== "production";
}
