/**
 * Role- and intent-aware post-onboarding redirect (client or server).
 * @param {{
 *   accountIntent?: string | null,
 *   platformRole?: string | null,
 *   sponsorOnboardingPath?: string | null,
 *   onboardingStatus?: string | null,
 * }} p
 */
export function postOnboardingDestination(p = {}) {
  const role = String(p.platformRole || "").toLowerCase();
  if (role === "admin" || role === "moderator") return "/community";

  const status = String(p.onboardingStatus || "").toLowerCase();
  const intent = String(p.accountIntent || "").toLowerCase();
  const sponsorPath = String(p.sponsorOnboardingPath || "").toLowerCase();

  if (intent === "sponsor_user" && (status === "needs_review" || sponsorPath === "application")) {
    return "/sponsors?apply=1";
  }
  if (intent === "sponsor_user") return "/profile";
  if (intent === "member_user") return "/community";
  if (intent === "support_user") return "/profile";
  if (intent === "free_user") return "/";
  return "/";
}
