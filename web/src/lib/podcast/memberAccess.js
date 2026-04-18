import { AUTH_KEY, PROFILE_KEY } from "@/lib/constants";
import {
  MEMBERSHIP_TIER_KEYS,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

/**
 * Pro tier (`member` in DB) — same gate as community story submission (see /api/community/posts).
 */
export function tierAllowsPodcastMemberContent(tierValue) {
  return normalizeMembershipTierKey(tierValue) === MEMBERSHIP_TIER_KEYS.MEMBER;
}

/**
 * Resolves podcast "members-only" access using the same session as the main app:
 * 1) WorkOS cookie session + `/api/me` (Supabase profile membership_tier)
 * 2) Demo/local fallback: AUTH_KEY + PROFILE_KEY when WorkOS user is not signed in
 */
export async function resolvePodcastMemberContentAccess() {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    const data = await res.json();
    if (typeof data?.entitlements?.podcastMemberContent === "boolean") {
      return data.entitlements.podcastMemberContent;
    }
    if (data?.authenticated && data?.profile) {
      return tierAllowsPodcastMemberContent(data.profile.membershipTier);
    }
  } catch {
    // fall through to local demo
  }

  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "{}");
    if (!auth?.isAuthenticated) return false;
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    const tier = profile.membershipTier || profile.membershipStatus || profile.tier;
    return tierAllowsPodcastMemberContent(tier);
  } catch {
    return false;
  }
}
