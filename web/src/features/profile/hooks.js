"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FAV_KEY, PROFILE_KEY } from "@/lib/constants";
import { loadJson, saveJson } from "@/lib/storage";
import { defaultProfile } from "@/lib/utils";
import {
  fetchProfileByUserId,
  fetchSavedOrgEinList,
  fetchSavedOrganizationsByEin,
  getOrCreateDemoUserId,
  replaceSavedOrgEinList,
  upsertProfileByUserId,
} from "@/features/profile/api";

function toLocalShape(profile) {
  return {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    membershipStatus: profile.membershipStatus || "supporter",
    banner: profile.banner || "How can we assist you today?",
    avatarUrl: profile.avatarUrl || "",
    theme: profile.theme || "clean",
    savedOrgEins: Array.isArray(profile.savedOrgEins) ? profile.savedOrgEins : [],
  };
}

function profileFromLegacy(localProfile) {
  const first = String(localProfile.firstName || "").trim();
  const last = String(localProfile.lastName || "").trim();
  const legacyName = String(localProfile.name || "").trim();
  const isPlaceholderLegacyName = /^(welcome\s*back\.?|supporter|your\s+name)$/i.test(legacyName);
  const [legacyFirst = "", ...legacyRest] = legacyName.split(/\s+/).filter(Boolean);
  return {
    firstName: first || (!isPlaceholderLegacyName && legacyFirst ? legacyFirst : ""),
    lastName: last || (!isPlaceholderLegacyName ? legacyRest.join(" ") : ""),
    email: String(localProfile.email || "").trim(),
    membershipStatus: String(localProfile.membershipStatus || localProfile.tier || "supporter").toLowerCase(),
    banner: String(localProfile.banner || "How can we assist you today?").trim(),
    avatarUrl: String(localProfile.photoDataUrl || localProfile.avatarUrl || "").trim(),
    theme: String(localProfile.theme || "clean").trim() || "clean",
    savedOrgEins: [],
  };
}

export function useProfileData(supabase) {
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const [userId, setUserId] = useState("demo-user");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState(() => profileFromLegacy(defaultProfile()));
  const [favoriteEins, setFavoriteEins] = useState([]);
  const [savedOrganizations, setSavedOrganizations] = useState([]);

  useEffect(() => {
    const id = getOrCreateDemoUserId();
    setUserId(id);
  }, []);

  useEffect(() => {
    const legacy = loadJson(PROFILE_KEY, defaultProfile());
    const storedFavs = loadJson(FAV_KEY, []);
    queueMicrotask(() => {
      setProfile(profileFromLegacy(legacy || {}));
      setFavoriteEins(Array.isArray(storedFavs) ? storedFavs : []);
    });
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoadingProfile(true);
      setProfileError("");
      try {
        if (supabase) {
          const dbProfile = await fetchProfileByUserId(supabase, userId);
          if (dbProfile) {
            setProfile((prev) => ({ ...prev, ...toLocalShape(dbProfile) }));
          }
          const dbEins = await fetchSavedOrgEinList(supabase, userId);
          if (dbEins.length) setFavoriteEins(dbEins);
        }
      } catch {
        setProfileError("Profile could not be fully loaded from Supabase.");
      } finally {
        hydratedRef.current = true;
        setLoadingProfile(false);
      }
    }
    if (userId) bootstrap();
  }, [supabase, userId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveJson(PROFILE_KEY, {
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      email: profile.email,
      tier: profile.membershipStatus === "member" ? "member" : "supporter",
      membershipStatus: profile.membershipStatus,
      firstName: profile.firstName,
      lastName: profile.lastName,
      banner: profile.banner,
      photoDataUrl: profile.avatarUrl || "",
      avatarUrl: profile.avatarUrl || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveJson(FAV_KEY, favoriteEins.slice(0, 500));
  }, [favoriteEins]);

  useEffect(() => {
    async function loadSavedOrgCards() {
      if (!supabase) return;
      try {
        const cards = await fetchSavedOrganizationsByEin(supabase, favoriteEins);
        setSavedOrganizations(cards);
      } catch {
        setSavedOrganizations([]);
      }
    }
    loadSavedOrgCards();
  }, [supabase, favoriteEins]);

  async function persistProfile(next) {
    setProfile(next);
    if (!supabase) return;
    try {
      await upsertProfileByUserId(supabase, userId, next);
    } catch {
      setProfileError("Profile saved locally, but cloud sync failed.");
    }
  }

  async function setMembershipStatus(status) {
    const normalized = String(status || "supporter").toLowerCase();
    await persistProfile({ ...profile, membershipStatus: normalized });
  }

  async function setFavoriteEinList(nextEins) {
    setFavoriteEins(nextEins);
    if (!supabase || syncingRef.current) return;
    syncingRef.current = true;
    try {
      await replaceSavedOrgEinList(supabase, userId, nextEins);
    } catch {
      setProfileError("Saved organizations updated locally, but cloud sync failed.");
    } finally {
      syncingRef.current = false;
    }
  }

  async function resetDemo() {
    const fresh = profileFromLegacy(defaultProfile());
    setProfile(fresh);
    setFavoriteEins([]);
    setSavedOrganizations([]);
    setProfileError("");
    try {
      await replaceSavedOrgEinList(supabase, userId, []);
    } catch {
      /* local reset still applies */
    }
    try {
      if (supabase) await upsertProfileByUserId(supabase, userId, fresh);
    } catch {
      /* ignore */
    }
  }

  function toggleFavoriteEin(ein) {
    const id = String(ein);
    const next = favoriteEins.includes(id) ? favoriteEins.filter((x) => x !== id) : [id, ...favoriteEins];
    setFavoriteEinList(next);
  }

  const fullName = useMemo(() => `${profile.firstName} ${profile.lastName}`.trim(), [profile.firstName, profile.lastName]);
  const greetingName = fullName || "Josh Melching";
  const isMember = profile.membershipStatus === "member";

  return {
    userId,
    loadingProfile,
    profileError,
    profile,
    setProfile,
    persistProfile,
    fullName,
    greetingName,
    isMember,
    favoriteEins,
    toggleFavoriteEin,
    setFavoriteEinList,
    savedOrganizations,
    setMembershipStatus,
    resetDemo,
  };
}
