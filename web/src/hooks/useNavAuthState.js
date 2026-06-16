"use client";

import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";

/**
 * Unified client auth for headers/chrome. Trusts nav cache until explicit sign-out
 * so brief /api/me misses during navigation do not flash signed-out UI.
 */
export function useNavAuthState() {
  const session = useAuthSession();
  const { isAuthenticated, loadingProfile } = useProfileData();
  const cache = typeof window !== "undefined" ? readNavAuthCache() : null;
  const sessionHint = !!cache?.authenticated;

  const authed = isAuthenticated || session.authenticated || sessionHint;
  const workos = session.workos || !!cache?.workos;

  const authLoading =
    !authed && session.loading && !sessionHint
      ? true
      : authed && loadingProfile && !isAuthenticated && !session.authenticated && sessionHint;

  return {
    authed,
    workos,
    authLoading,
    sessionHint,
    session,
    isAuthenticated,
    loadingProfile,
    cache,
  };
}
