"use client";

import { useCallback, useState } from "react";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import {
  openNativeWorkOSSignIn,
  openWebBilling,
  openWebLogin,
  openWebMembership,
  openWebProfile,
  openWebSignup,
  openWebSponsorMembership,
  requiresExternalWebAccountFlow,
} from "@/lib/capacitor/webAccountRedirects";

/**
 * Native mobile account + billing helpers with server refresh after web flows.
 */
export function useNativeWebAccountFlow() {
  const { refresh: refreshAuthSession } = useAuthSession();
  const { refreshWorkOSProfile } = useProfileData();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const nativeExternalFlow = requiresExternalWebAccountFlow();

  const refreshAccountStatus = useCallback(async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      await refreshWorkOSProfile();
      await refreshAuthSession({ soft: false });
      return { ok: true };
    } catch {
      setRefreshError("Could not refresh your account. Check your connection and try again.");
      return { ok: false };
    } finally {
      setRefreshing(false);
    }
  }, [refreshAuthSession, refreshWorkOSProfile]);

  return {
    nativeExternalFlow,
    refreshing,
    refreshError,
    refreshAccountStatus,
    openWebSignup,
    openWebLogin,
    openNativeWorkOSSignIn,
    openWebMembership,
    openWebBilling,
    openWebSponsorMembership,
    openWebProfile,
  };
}
