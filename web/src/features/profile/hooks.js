"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AUTH_KEY, FAV_KEY, PROFILE_KEY } from "@/lib/constants";
import { loadJson, saveJson } from "@/lib/storage";
import { defaultProfile } from "@/lib/utils";
import {
  createInitialProfile,
  getMembershipMeta,
  profileFromLegacy,
  toLocalShape,
  toLocalStorageProfile,
} from "@/features/profile/mappers";
import {
  fetchProfileByUserId,
  fetchSavedOrgEinList,
  fetchSavedOrganizationsByEin,
  getOrCreateDemoUserId,
  replaceSavedOrgEinList,
  upsertProfileByUserId,
} from "@/features/profile/api";

export function useProfileData(supabase) {
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const [userId, setUserId] = useState("demo-user");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSource, setProfileSource] = useState("local");
  const [profile, setProfile] = useState(() => createInitialProfile());
  const [favoriteEins, setFavoriteEins] = useState([]);
  const [savedOrganizations, setSavedOrganizations] = useState([]);

  useEffect(() => {
    const id = getOrCreateDemoUserId();
    setUserId(id);
  }, []);

  useEffect(() => {
    const legacy = loadJson(PROFILE_KEY, defaultProfile());
    const storedFavs = loadJson(FAV_KEY, []);
    const authState = loadJson(AUTH_KEY, { isAuthenticated: false });
    const authenticated = !!authState?.isAuthenticated;
    queueMicrotask(() => {
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        setProfile(createInitialProfile());
        setFavoriteEins([]);
        setLoadingProfile(false);
        hydratedRef.current = true;
        return;
      }
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
            setProfileSource("supabase");
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
    if (userId && isAuthenticated) bootstrap();
    if (!isAuthenticated) {
      hydratedRef.current = true;
      setLoadingProfile(false);
    }
  }, [supabase, userId, isAuthenticated]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveJson(PROFILE_KEY, toLocalStorageProfile(profile));
  }, [profile]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveJson(FAV_KEY, favoriteEins.slice(0, 500));
  }, [favoriteEins]);

  useEffect(() => {
    saveJson(AUTH_KEY, { isAuthenticated });
  }, [isAuthenticated]);

  useEffect(() => {
    async function loadSavedOrgCards() {
      if (!supabase) return;
      if (!isAuthenticated) {
        setSavedOrganizations([]);
        return;
      }
      try {
        const cards = await fetchSavedOrganizationsByEin(supabase, favoriteEins);
        setSavedOrganizations(cards);
      } catch {
        setSavedOrganizations([]);
      }
    }
    loadSavedOrgCards();
  }, [supabase, favoriteEins, isAuthenticated]);

  async function persistProfile(next) {
    setProfile(next);
    if (!supabase || !isAuthenticated) return;
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
    if (!supabase || syncingRef.current || !isAuthenticated) return;
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

  async function createAccount({ firstName = "", lastName = "", email = "", password = "" } = {}) {
    const safeFirst = String(firstName || "").trim();
    const safeLast = String(lastName || "").trim();
    const safeEmail = String(email || "").trim();
    if (!safeFirst || !safeLast || !safeEmail || String(password || "").trim().length < 6) {
      return { ok: false, message: "Please complete all fields. Password must be at least 6 characters." };
    }
    const next = {
      ...createInitialProfile(),
      firstName: safeFirst,
      lastName: safeLast,
      email: safeEmail,
      membershipStatus: "support",
      banner: "Hi, I’m Andy",
    };
    setIsAuthenticated(true);
    setProfile(next);
    try {
      if (supabase) await upsertProfileByUserId(supabase, userId, next);
    } catch {
      /* local-first demo flow */
    }
    return { ok: true };
  }

  async function signInWithEmail(email = "") {
    const safeEmail = String(email || "").trim();
    if (!safeEmail) return { ok: false, message: "Enter your email to continue." };
    const next = {
      ...profile,
      email: safeEmail,
      banner: profile.banner || "Hi, I’m Andy",
    };
    setIsAuthenticated(true);
    setProfile(next);
    return { ok: true };
  }

  function signOut() {
    setIsAuthenticated(false);
    setProfile(createInitialProfile());
    setFavoriteEins([]);
    setSavedOrganizations([]);
  }

  function toggleFavoriteEin(ein) {
    const id = String(ein);
    const next = favoriteEins.includes(id) ? favoriteEins.filter((x) => x !== id) : [id, ...favoriteEins];
    setFavoriteEinList(next);
  }

  const fullName = useMemo(() => `${profile.firstName} ${profile.lastName}`.trim(), [profile.firstName, profile.lastName]);
  const greetingName = fullName || "Supporter";
  const membership = useMemo(() => getMembershipMeta(profile.membershipStatus), [profile.membershipStatus]);
  const isMember = membership.isMember;

  return {
    userId,
    isAuthenticated,
    loadingProfile,
    profileError,
    profileSource,
    profile,
    setProfile,
    persistProfile,
    fullName,
    greetingName,
    membership,
    isMember,
    favoriteEins,
    toggleFavoriteEin,
    setFavoriteEinList,
    savedOrganizations,
    setMembershipStatus,
    resetDemo,
    createAccount,
    signInWithEmail,
    signOut,
  };
}
