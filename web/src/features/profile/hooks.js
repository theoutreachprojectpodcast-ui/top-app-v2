"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AUTH_KEY, DEMO_ACCOUNT_KEY, FAV_KEY, PROFILE_KEY } from "@/lib/constants";
import { AUTH_PROVIDER } from "@/lib/auth/providers";
import {
  clearDemoAccount,
  demoCredentialsMatch,
  readDemoAccount,
  writeDemoAccount,
} from "@/lib/auth/demoAccountStore";
import { loadJson, saveJson } from "@/lib/storage";
import { defaultProfile } from "@/lib/utils";
import {
  createInitialProfile,
  getMembershipMeta,
  profileFromLegacy,
  toLocalShape,
  toLocalStorageProfile,
} from "@/features/profile/mappers";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import {
  fetchProfileByUserId,
  fetchSavedOrgEinList,
  fetchSavedOrganizationsByEin,
  DEMO_USER_KEY,
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
  const [authProvider, setAuthProvider] = useState(null);
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
    const storedProvider = authState?.provider || null;
    queueMicrotask(() => {
      setIsAuthenticated(authenticated);
      setAuthProvider(authenticated ? storedProvider || AUTH_PROVIDER.DEMO_EMAIL : null);
      if (!authenticated) {
        setProfile(createInitialProfile());
        setFavoriteEins([]);
        setLoadingProfile(false);
        hydratedRef.current = true;
        return;
      }
      setProfile(profileFromLegacy(legacy || {}));
      const rawFavs = Array.isArray(storedFavs) ? storedFavs : [];
      setFavoriteEins([...new Set(rawFavs.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))]);
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
    if (isAuthenticated) {
      saveJson(AUTH_KEY, {
        isAuthenticated: true,
        provider: authProvider || AUTH_PROVIDER.DEMO_EMAIL,
        email: profile.email || "",
      });
    } else {
      saveJson(AUTH_KEY, { isAuthenticated: false });
    }
  }, [isAuthenticated, authProvider, profile.email]);

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
    const normalized = [...new Set((nextEins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
    setFavoriteEins(normalized);
    if (!supabase || syncingRef.current || !isAuthenticated) return;
    syncingRef.current = true;
    try {
      await replaceSavedOrgEinList(supabase, userId, normalized);
    } catch {
      setProfileError("Saved organizations updated locally, but cloud sync failed.");
    } finally {
      syncingRef.current = false;
    }
  }

  async function resetDemo() {
    const cloudUserId = userId;
    const localKeysToClear = [
      PROFILE_KEY,
      FAV_KEY,
      AUTH_KEY,
      DEMO_USER_KEY,
      DEMO_ACCOUNT_KEY,
      "top_sponsor_applications_demo",
      "top_proven_ally_applications_demo",
      "top_community_pending_submissions",
      "top_community_local_approved_posts",
      "top_community_liked_posts",
      "top_community_connection_requests",
      "torp-color-scheme",
    ];
    const sessionKeysToClear = ["torp-directory-session-v1"];

    if (typeof window !== "undefined") {
      for (const key of localKeysToClear) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
      for (const key of sessionKeysToClear) {
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
    }

    const fresh = profileFromLegacy(defaultProfile());
    setProfile(fresh);
    setFavoriteEins([]);
    setSavedOrganizations([]);
    setProfileError("");
    setIsAuthenticated(false);
    setAuthProvider(null);
    clearDemoAccount();
    const nextUserId = typeof window !== "undefined" ? getOrCreateDemoUserId() : "demo-user";
    setUserId(nextUserId);
    if (supabase && cloudUserId) {
      try {
        await replaceSavedOrgEinList(supabase, cloudUserId, []);
      } catch {
        /* local reset still applies */
      }
    }
  }

  async function createAccount({ firstName = "", lastName = "", email = "", password = "", avatarUrl = "" } = {}) {
    const safeFirst = String(firstName || "").trim();
    const safeLast = String(lastName || "").trim();
    const safeEmail = String(email || "").trim();
    if (!safeFirst || !safeLast || !safeEmail || String(password || "").trim().length < 6) {
      return { ok: false, message: "Please complete all fields. Password must be at least 6 characters." };
    }
    const safeAvatar = String(avatarUrl || "").trim();
    const next = {
      ...createInitialProfile(),
      firstName: safeFirst,
      lastName: safeLast,
      email: safeEmail,
      membershipStatus: "support",
      banner: "Hi, I’m Andy",
      avatarUrl: safeAvatar,
    };
    setIsAuthenticated(true);
    setAuthProvider(AUTH_PROVIDER.DEMO_EMAIL);
    setProfile(next);
    writeDemoAccount(safeEmail, String(password || "").trim());
    try {
      if (supabase) await upsertProfileByUserId(supabase, userId, next);
    } catch {
      /* local-first demo flow */
    }
    return { ok: true };
  }

  /**
   * Demo email/password sign-in. Swap this body for `supabase.auth.signInWithPassword`
   * (and OAuth) when wiring real auth; keep the same return shape for callers.
   */
  async function signInWithCredentials({ email = "", password = "" } = {}) {
    const safeEmail = String(email || "").trim();
    const safePassword = String(password || "").trim();
    if (!safeEmail) return { ok: false, message: "Enter your email to continue." };
    if (safePassword.length < 6) return { ok: false, message: "Password must be at least 6 characters." };

    const acct = readDemoAccount();

    function applySessionFromStorage() {
      const legacy = loadJson(PROFILE_KEY, defaultProfile());
      setProfile(profileFromLegacy(legacy || {}));
      const storedFavs = loadJson(FAV_KEY, []);
      const rawFavs = Array.isArray(storedFavs) ? storedFavs : [];
      setFavoriteEins([...new Set(rawFavs.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))]);
      setIsAuthenticated(true);
      setAuthProvider(AUTH_PROVIDER.DEMO_EMAIL);
    }

    if (acct) {
      if (demoCredentialsMatch(safeEmail, safePassword)) {
        applySessionFromStorage();
        return { ok: true };
      }
      return { ok: false, message: "Incorrect email or password." };
    }

    const legacy = loadJson(PROFILE_KEY, defaultProfile());
    const legacyShape = profileFromLegacy(legacy || {});
    const legacyEmail = String(legacyShape?.email || "").trim().toLowerCase();
    if (legacyEmail && legacyEmail === safeEmail.toLowerCase()) {
      writeDemoAccount(safeEmail, safePassword);
      setProfile(legacyShape);
      const storedFavs = loadJson(FAV_KEY, []);
      const rawFavs = Array.isArray(storedFavs) ? storedFavs : [];
      setFavoriteEins([...new Set(rawFavs.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))]);
      setIsAuthenticated(true);
      setAuthProvider(AUTH_PROVIDER.DEMO_EMAIL);
      return { ok: true };
    }

    return { ok: false, message: "No account found for this email. Create an account first." };
  }

  function signOut() {
    setIsAuthenticated(false);
    setAuthProvider(null);
    setProfile(createInitialProfile());
    setFavoriteEins([]);
    setSavedOrganizations([]);
  }

  function toggleFavoriteEin(ein) {
    const id = normalizeEinDigits(ein);
    if (id.length !== 9) return;
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
    signInWithCredentials,
    signOut,
  };
}
