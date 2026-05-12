/**
 * Whether to show local-demo-only UI (Reset Demo, demo membership upgrade, etc.).
 * - Production Next.js builds set NODE_ENV to "production" on the client bundle.
 * - Set NEXT_PUBLIC_TOP_SHOW_DEMO_UI=1 to force demo chrome on in a production build (internal QA only).
 */
export function showLocalDemoChrome() {
  if (typeof process !== "undefined" && String(process.env.NEXT_PUBLIC_TOP_SHOW_DEMO_UI || "").trim() === "1") {
    return true;
  }
  if (typeof process !== "undefined" && String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    return false;
  }
  return true;
}
