"use client";

import { createContext, useContext, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useProfileDataState } from "@/features/profile/hooks";

const ProfileDataContext = createContext(null);

export function ProfileDataProvider({ children }) {
  const sb = useMemo(() => getSupabaseClient(), []);
  const value = useProfileDataState(sb);
  return <ProfileDataContext.Provider value={value}>{children}</ProfileDataContext.Provider>;
}

export function useProfileData() {
  const ctx = useContext(ProfileDataContext);
  if (!ctx) {
    throw new Error("useProfileData must be used within ProfileDataProvider (root layout).");
  }
  return ctx;
}
