"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useProfileDataState } from "@/features/profile/hooks";
import { useColorScheme } from "@/components/app/ColorSchemeRoot";

const ProfileDataContext = createContext(null);

export function ProfileDataProvider({ children }) {
  const sb = useMemo(() => getSupabaseClient(), []);
  const value = useProfileDataState(sb);
  const { colorScheme, setColorScheme } = useColorScheme();
  const appliedProfileSchemeRef = useRef("");

  useEffect(() => {
    if (!value?.isAuthenticated) {
      appliedProfileSchemeRef.current = "";
      return;
    }
    if (value?.loadingProfile) return;
    const pref = String(value?.profile?.colorScheme || "").trim().toLowerCase();
    if (pref !== "light" && pref !== "dark") return;
    const key = `${String(value?.profile?.profileRecordId || "session")}::${pref}`;
    if (appliedProfileSchemeRef.current === key) return;
    appliedProfileSchemeRef.current = key;
    if (pref !== colorScheme) {
      setColorScheme(pref);
    }
  }, [
    value?.isAuthenticated,
    value?.loadingProfile,
    value?.profile?.profileRecordId,
    value?.profile?.colorScheme,
    colorScheme,
    setColorScheme,
  ]);

  return <ProfileDataContext.Provider value={value}>{children}</ProfileDataContext.Provider>;
}

export function useProfileData() {
  const ctx = useContext(ProfileDataContext);
  if (!ctx) {
    throw new Error("useProfileData must be used within ProfileDataProvider (root layout).");
  }
  return ctx;
}
