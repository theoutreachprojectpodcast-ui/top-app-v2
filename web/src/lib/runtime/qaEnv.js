/**
 * QA / preview detection for UI and seeds (not a security boundary).
 * - Client: set `NEXT_PUBLIC_TOP_QA=1` and/or `NEXT_PUBLIC_VERCEL_ENV=preview` on Preview deployments.
 * - Server scripts: `VERCEL_ENV=preview` or `TOP_QA_SEED=1`.
 */
export function isQaLikeDeployment() {
  if (String(process.env.NEXT_PUBLIC_TOP_QA || "").trim() === "1") return true;
  if (String(process.env.NEXT_PUBLIC_VERCEL_ENV || "").toLowerCase() === "preview") return true;
  if (String(process.env.VERCEL_ENV || "").toLowerCase() === "preview") return true;
  return String(process.env.TOP_QA_SEED || "").trim() === "1";
}

/**
 * When true, public community feed must omit rows with `is_demo_seed === true`.
 * Preview / explicit QA flags keep seeds visible for layout QA.
 */
export function shouldHideDemoCommunitySeeds() {
  if (isQaLikeDeployment()) return false;
  if (String(process.env.VERCEL_ENV || "").toLowerCase() === "preview") return false;
  if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") return false;
  return true;
}
