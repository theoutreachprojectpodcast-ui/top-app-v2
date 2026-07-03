"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AUTH_KEY, DEMO_ACCOUNT_KEY, FAV_ENTITY_KEY, FAV_KEY, PROFILE_KEY } from "@/lib/constants";
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
  mergeAccountEmailIntoProfileDto,
  profileFromApiDto,
  profileFromLegacy,
  toLocalShape,
  toLocalStorageProfile,
} from "@/features/profile/mappers";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { clearNavAuthCache, readNavAuthCache, writeNavAuthCache } from "@/lib/auth/navAuthCache";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { navCacheHasFreeAccess } from "@/lib/membership/appAccess";

function entitlementsFromApi(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      podcastMemberContent: false,
      communityStorySubmit: false,
      communityPostCreate: false,
      directoryAccess: false,
      saveOrganizationsAccess: false,
      fullPlatformAccess: false,
      communityViewAccess: false,
      isPrivilegedStaff: false,
      isPlatformAdmin: false,
    };
  }
  return {
    podcastMemberContent: !!raw.podcastMemberContent,
    communityStorySubmit: !!raw.communityStorySubmit,
    communityPostCreate: !!raw.communityPostCreate,
    directoryAccess: !!raw.directoryAccess,
    saveOrganizationsAccess: !!raw.saveOrganizationsAccess,
    fullPlatformAccess: !!raw.fullPlatformAccess,
    communityViewAccess: !!raw.communityViewAccess,
    isPrivilegedStaff: !!raw.isPrivilegedStaff,
    isPlatformAdmin: !!raw.isPlatformAdmin,
  };
}
import { isDemoModeEnabled } from "@/lib/runtime/launchMode";
import {
  fetchProfileByUserId,
  fetchSavedOrgEinList,
  fetchSavedOrganizationsByEin,
  DEMO_USER_KEY,
  getOrCreateDemoUserId,
  replaceSavedOrgEinList,
  upsertProfileByUserId,
} from "@/features/profile/api";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import { profileToApiPatch } from "@/lib/profile/profileApiPatch";

const SESSION_FETCH_TIMEOUT_MS = 12_000;
const PROFILE_LOAD_SAFETY_MS = 15_000;

async function fetchWithTimeout(url, options = {}, timeoutMs = SESSION_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function mapLegacyMembershipToTier(status) {
  const v = String(status || "").toLowerCase();
  if (v === "member" || v === "demo") return "member";
  if (v === "sponsor") return "sponsor";
  if (v === "none" || v === "guest" || v === "") return "free";
  if (v === "supporter" || v === "support") return "support";
  return "support";
}

function profileSaveErrorMessage(data, res) {
  const code = String(data?.error || "").trim();
  if (code === "organization_not_allowed" || res?.status === 401) {
    return (
      data?.message ||
      "Your sign-in session is not authorized for this app. Sign out and sign in again with an account in the WorkOS organization."
    );
  }
  if (code === "server_storage_unavailable" || res?.status === 503) {
    return "Profile save is temporarily unavailable (server storage). Try again shortly.";
  }
  if (code === "completeness_sync_failed") {
    return data?.message || "Profile saved partially; completeness sync failed. Try again.";
  }
  return data?.message || data?.error || "Profile could not be saved to the server.";
}

/**
 * Profile + favorites state for the signed-in session. Mount once via `ProfileDataProvider` in the root layout
 * so navigating between `/`, `/profile`, etc. does not remount this hook and wipe cloud profile state.
 */
export function useProfileDataState(supabase) {
  const demoModeEnabled = isDemoModeEnabled();
  const { authenticated: sessionAuthenticated } = useAuthSession();
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const workosRef = useRef(false);
  const sessionKindRef = useRef("none");
  const [userId, setUserId] = useState(() =>
    typeof window !== "undefined" ? getOrCreateDemoUserId() : "demo-user",
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [profileSource, setProfileSource] = useState("local");
  const [profile, setProfile] = useState(() => createInitialProfile());
  const [favoriteEins, setFavoriteEins] = useState([]);
  const [favoriteEntityKeys, setFavoriteEntityKeys] = useState([]);
  const [savedOrganizations, setSavedOrganizations] = useState([]);
  const [sessionKind, setSessionKind] = useState("none");

  useEffect(() => {
    sessionKindRef.current = sessionKind;
  }, [sessionKind]);
  const [authBackend, setAuthBackend] = useState({
    workos: !isDemoModeEnabled(),
    workosMissingEnv: [],
    stripe: false,
    stripePortal: false,
    supabaseServiceRole: false,
  });
  const [entitlements, setEntitlements] = useState(() => entitlementsFromApi(null));
  /** WorkOS session email from `GET /api/me` `user.email` (sign-in identity); may differ from `profile.email` after a settings change. */
  const [workOSAccountEmail, setWorkOSAccountEmail] = useState("");

  /**
   * Before paint on each TopApp mount (every client route change remounts TopApp): restore session hints so we
   * do not flash signed-out UI while /api/me rehydrates. WorkOS: nav cache from AuthSessionProvider; demo: AUTH_KEY.
   */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const c = readNavAuthCache();
    if (c?.authenticated && c?.workos) {
      workosRef.current = true;
      setSessionKind("workos");
      setIsAuthenticated(true);
      return;
    }
    const authState = loadJson(AUTH_KEY, { isAuthenticated: false });
    if (demoModeEnabled && authState?.isAuthenticated) {
      workosRef.current = false;
      setSessionKind("demo");
      setIsAuthenticated(true);
      setAuthProvider(authState.provider || AUTH_PROVIDER.DEMO_EMAIL);
    }
  }, []);

  const refreshWorkOSProfile = useCallback(async () => {
    const cache = readNavAuthCache();
    if (!workosRef.current && cache?.authenticated) {
      workosRef.current = true;
      setSessionKind("workos");
      setIsAuthenticated(true);
      setAuthProvider(AUTH_PROVIDER.WORKOS);
    }
    if (!workosRef.current) return;
    try {
      const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!data?.authenticated) return;
      if (data.entitlements && typeof data.entitlements === "object") {
        setEntitlements(entitlementsFromApi(data.entitlements));
        writeNavAuthCache(true, true, {
          hasFreeAccess: navCacheHasFreeAccess(
            data.profile ? profileFromApiDto(mergeAccountEmailIntoProfileDto(data.profile, data.user)) : null,
            data.entitlements,
          ),
        });
      }
      if (data.user?.email != null) {
        setWorkOSAccountEmail(String(data.user.email || "").trim());
      }
      if (data.authenticated && data.profile) {
        setProfile(profileFromApiDto(mergeAccountEmailIntoProfileDto(data.profile, data.user)));
        setProfileSource("cloud");
      }
    } catch {
      setProfileError("Could not refresh your profile.");
    }
  }, []);

  useEffect(() => {
    if (!sessionAuthenticated) return;
    if (workosRef.current && isAuthenticated) return;
    workosRef.current = true;
    setSessionKind("workos");
    setIsAuthenticated(true);
    setAuthProvider(AUTH_PROVIDER.WORKOS);
    void refreshWorkOSProfile();
  }, [sessionAuthenticated, isAuthenticated, refreshWorkOSProfile]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoadingProfile(true);
      setProfileError("");
      const cacheNav = typeof window !== "undefined" ? readNavAuthCache() : null;
      try {
        const [statusRes, meRes] = await Promise.all([
          fetchWithTimeout("/api/auth/status", { credentials: "include" }),
          fetchWithTimeout("/api/me", { credentials: "include", cache: "no-store" }),
        ]);
        const status = await statusRes.json();
        let me = await meRes.json();
        if (!me.authenticated && cacheNav?.authenticated) {
          for (let attempt = 0; attempt < 3 && !me.authenticated; attempt++) {
            await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
            const meRetry = await fetchWithTimeout("/api/me", { credentials: "include", cache: "no-store" });
            me = await meRetry.json().catch(() => ({}));
          }
        }
        /* Authenticated but profile null: transient storage/read — avoid replacing with IdP-only stub. */
        if (me.authenticated && (me.profile == null || me.profile === undefined)) {
          for (let attempt = 0; attempt < 2 && me.authenticated && me.profile == null; attempt++) {
            if (cancelled) return;
            await new Promise((r) => setTimeout(r, 160 * (attempt + 1)));
            const meRetry = await fetchWithTimeout("/api/me", { credentials: "include", cache: "no-store" });
            me = await meRetry.json().catch(() => ({}));
          }
        }
        if (cancelled) return;
        setAuthBackend({
          workos: !!status.workos,
          workosMissingEnv: Array.isArray(status.workosMissingEnv) ? status.workosMissingEnv : [],
          stripe: !!status.stripe,
          stripePortal: !!(status.stripePortal ?? status.stripe),
          stripeMemberRecurringMissingEnv: Array.isArray(status.stripeMemberRecurringMissingEnv)
            ? status.stripeMemberRecurringMissingEnv
            : [],
          stripeSponsorSubscription: !!status.stripeSponsorSubscription,
          stripeFullOnboarding: !!status.stripeFullOnboarding,
          supabaseServiceRole: !!status.supabaseServiceRole,
        });

        if (me.authenticated) {
          workosRef.current = true;
          setSessionKind("workos");
          setIsAuthenticated(true);
          setAuthProvider(AUTH_PROVIDER.WORKOS);
          const raw =
            me.profile ||
            {
              firstName: me.user?.firstName || "",
              lastName: me.user?.lastName || "",
              email: me.user?.email || "",
              membershipTier: "free",
              membershipBillingStatus: "none",
              onboardingCompleted: false,
            };
          const dto = mergeAccountEmailIntoProfileDto(raw, me.user);
          const profileDto = profileFromApiDto(dto);
          if (me.entitlements && typeof me.entitlements === "object") {
            setEntitlements(entitlementsFromApi(me.entitlements));
          }
          writeNavAuthCache(true, !!status.workos, {
            hasFreeAccess: navCacheHasFreeAccess(
              profileDto,
              me.entitlements && typeof me.entitlements === "object" ? me.entitlements : null,
            ),
          });
          setProfile(profileDto);
          setWorkOSAccountEmail(String(me.user?.email || "").trim());
          setProfileSource("cloud");
          hydratedRef.current = true;
          setLoadingProfile(false);
          void (async () => {
            try {
              const favRes = await fetch("/api/me/saved-orgs", { credentials: "include" });
              const favJson = await favRes.json().catch(() => ({}));
              if (Array.isArray(favJson.eins)) {
                setFavoriteEins(favJson.eins);
              }
              const entityFavRes = await fetch("/api/me/favorites", { credentials: "include" });
              const entityFavJson = await entityFavRes.json().catch(() => ({}));
              if (Array.isArray(entityFavJson.keys)) {
                setFavoriteEntityKeys(
                  [...new Set(entityFavJson.keys.map((k) => String(k || "").trim().toLowerCase()).filter((k) => k.startsWith("trusted:")))].slice(
                    0,
                    500,
                  ),
                );
              }
            } catch {
              /* membership-gated favorites — never block session */
            }
          })();
          return;
        }

        /**
         * Nav cache said we were signed in but /api/me still failed after retry — keep the session
         * hint (transient cookie/network). Only explicit sign-out clears nav cache.
         */
        if (cacheNav?.authenticated) {
          workosRef.current = true;
          setSessionKind("workos");
          setIsAuthenticated(true);
          setAuthProvider(AUTH_PROVIDER.WORKOS);
          writeNavAuthCache(true, true, { hasFreeAccess: false });
          hydratedRef.current = true;
          setLoadingProfile(false);
          return;
        }

        workosRef.current = false;
        setWorkOSAccountEmail("");
        setSessionKind(demoModeEnabled ? "demo" : "none");
        const legacy = loadJson(PROFILE_KEY, defaultProfile());
        const storedFavs = loadJson(FAV_KEY, []);
        const storedEntityFavs = loadJson(FAV_ENTITY_KEY, []);
        const authState = loadJson(AUTH_KEY, { isAuthenticated: false });
        const authenticated = demoModeEnabled ? !!authState?.isAuthenticated : false;
        const storedProvider = authState?.provider || null;
        setIsAuthenticated(authenticated);
        setAuthProvider(authenticated ? storedProvider || AUTH_PROVIDER.DEMO_EMAIL : null);
        if (!authenticated) {
          setProfile(createInitialProfile());
          setFavoriteEins([]);
          hydratedRef.current = true;
          setLoadingProfile(false);
          return;
        }
        setProfile(profileFromLegacy(legacy || {}));
        const rawFavs = Array.isArray(storedFavs) ? storedFavs : [];
        setFavoriteEins([...new Set(rawFavs.map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))]);
        const rawEntityFavs = Array.isArray(storedEntityFavs) ? storedEntityFavs : [];
        setFavoriteEntityKeys(
          [...new Set(rawEntityFavs.map((k) => String(k || "").trim().toLowerCase()).filter((k) => k.startsWith("trusted:")))].slice(0, 500),
        );

        if (supabase) {
          try {
            const dbProfile = await fetchProfileByUserId(supabase, userId);
            if (dbProfile) {
              setProfile((prev) => ({ ...prev, ...toLocalShape(dbProfile) }));
              setProfileSource("supabase");
            }
            const dbEins = await fetchSavedOrgEinList(supabase, userId);
            if (dbEins.length) setFavoriteEins(dbEins);
          } catch {
            setProfileError("Profile could not be fully loaded from Supabase.");
          }
        }
        hydratedRef.current = true;
        setLoadingProfile(false);
      } catch {
        if (!cancelled) {
          setAuthBackend((prev) => ({
            ...prev,
            workos: prev.workos || !isDemoModeEnabled(),
          }));
          setProfileError("Could not initialize session.");
          hydratedRef.current = true;
          setLoadingProfile(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  /** Never block native gates on an infinite profile load. */
  useEffect(() => {
    if (!loadingProfile) return undefined;
    const timer = window.setTimeout(() => {
      setLoadingProfile(false);
      setProfileError((prev) => prev || "Profile load timed out. You can continue and retry from Settings.");
    }, PROFILE_LOAD_SAFETY_MS);
    return () => window.clearTimeout(timer);
  }, [loadingProfile]);

  useEffect(() => {
    async function bootstrapDemoCloud() {
      if (!hydratedRef.current || workosRef.current || !demoModeEnabled) return;
      if (sessionKind !== "demo" || !isAuthenticated || !supabase || !userId) return;
      setLoadingProfile(true);
      setProfileError("");
      try {
        const dbProfile = await fetchProfileByUserId(supabase, userId);
        if (dbProfile) {
          setProfile((prev) => ({ ...prev, ...toLocalShape(dbProfile) }));
          setProfileSource("supabase");
        }
        const dbEins = await fetchSavedOrgEinList(supabase, userId);
        if (dbEins.length) setFavoriteEins(dbEins);
      } catch {
        setProfileError("Profile could not be fully loaded from Supabase.");
      } finally {
        setLoadingProfile(false);
      }
    }
    bootstrapDemoCloud();
  }, [sessionKind, isAuthenticated, supabase, userId]);

  useEffect(() => {
    if (!hydratedRef.current || workosRef.current || !demoModeEnabled) return;
    saveJson(PROFILE_KEY, toLocalStorageProfile(profile));
  }, [profile]);

  useEffect(() => {
    if (!hydratedRef.current || workosRef.current || !demoModeEnabled) return;
    saveJson(FAV_KEY, favoriteEins.slice(0, 500));
  }, [favoriteEins]);

  useEffect(() => {
    if (!hydratedRef.current || workosRef.current || !demoModeEnabled) return;
    saveJson(FAV_ENTITY_KEY, favoriteEntityKeys.slice(0, 500));
  }, [favoriteEntityKeys]);

  useEffect(() => {
    if (workosRef.current || !demoModeEnabled) return;
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
      if (!isAuthenticated) {
        setSavedOrganizations([]);
        return;
      }
      if (!favoriteEins.length) {
        setSavedOrganizations([]);
        return;
      }
      try {
        if (workosRef.current) {
          const res = await fetch("/api/me/saved-orgs/cards", { credentials: "include" });
          const j = await res.json().catch(() => ({}));
          const rows = Array.isArray(j.rows) ? j.rows : [];
          setSavedOrganizations(rows.map((r) => mapNonprofitCardRow(r, "saved")));
          return;
        }
        if (!supabase) {
          setSavedOrganizations([]);
          return;
        }
        const rows = await fetchSavedOrganizationsByEin(supabase, favoriteEins);
        setSavedOrganizations(rows.map((r) => mapNonprofitCardRow(r, "saved")));
      } catch {
        setSavedOrganizations([]);
      }
    }
    loadSavedOrgCards();
  }, [supabase, favoriteEins, isAuthenticated]);

  /**
   * @returns {Promise<{ ok: true, profile?: Record<string, unknown>, localOnly?: boolean } | { ok: false, message: string }>}
   */
  async function persistProfile(next) {
    if (!isAuthenticated) {
      setProfile(next);
      return { ok: true, profile: next };
    }
    if (workosRef.current || sessionKindRef.current === "workos") {
      workosRef.current = true;
      try {
        const res = await fetch("/api/me/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileToApiPatch(next)),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = profileSaveErrorMessage(data, res);
          setProfileError(message);
          await refreshWorkOSProfile();
          return { ok: false, message };
        }
        let savedDto = data.profile;
        if (savedDto) {
          const merged = mergeAccountEmailIntoProfileDto(savedDto, {
            email: workOSAccountEmail || undefined,
          });
          setProfile(profileFromApiDto(merged));
          setProfileError("");
          savedDto = merged;
        } else {
          await refreshWorkOSProfile();
        }
        return { ok: true, profile: savedDto || undefined };
      } catch {
        const message = "Profile could not be saved to the server.";
        setProfileError(message);
        await refreshWorkOSProfile();
        return { ok: false, message };
      }
    }
    setProfile(next);
    try {
      saveJson(PROFILE_KEY, toLocalStorageProfile(next));
    } catch {
      /* quota / private mode */
    }
    /* Demo session while WorkOS is configured: local only — cloud profile requires WorkOS sign-in. */
    if (!supabase || authBackend.workos) {
      const message =
        "Saved on this device only. Sign in with your account (not demo) to update your cloud profile and completeness checklist.";
      setProfileError(message);
      return { ok: true, profile: next, localOnly: true, message };
    }
    try {
      await upsertProfileByUserId(supabase, userId, next);
      return { ok: true, profile: next };
    } catch {
      const message = "Profile saved on this device, but cloud sync failed.";
      setProfileError(message);
      return { ok: false, message };
    }
  }

  async function setMembershipStatus(status) {
    if (workosRef.current) {
      /* WorkOS accounts: tier is driven by Stripe webhooks, not client-side PATCH (avoids spoofing). */
      return;
    }
    const normalized = String(status || "supporter").toLowerCase();
    const tier = mapLegacyMembershipToTier(normalized);
    const billing = tier === "free" ? "none" : "none";
    await persistProfile({
      ...profile,
      membershipStatus: normalized,
      membershipTier: tier,
      membershipBillingStatus: billing,
    });
  }

  async function setFavoriteEinList(nextEins) {
    const normalized = [...new Set((nextEins || []).map((e) => normalizeEinDigits(e)).filter((e) => e.length === 9))];
    setFavoriteEins(normalized);
    if (!isAuthenticated) return;
    if (workosRef.current) {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const res = await fetch("/api/me/saved-orgs", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eins: normalized }),
        });
        if (!res.ok) setProfileError("Saved organizations could not sync to the server.");
      } catch {
        setProfileError("Saved organizations could not sync to the server.");
      } finally {
        syncingRef.current = false;
      }
      return;
    }
    if (!supabase || syncingRef.current) return;
    syncingRef.current = true;
    try {
      await replaceSavedOrgEinList(supabase, userId, normalized);
    } catch {
      setProfileError("Saved organizations updated locally, but cloud sync failed.");
    } finally {
      syncingRef.current = false;
    }
  }

  async function setFavoriteEntityKeyList(nextKeys) {
    const normalized = [
      ...new Set(
        (nextKeys || [])
          .map((k) => String(k || "").trim().toLowerCase())
          .filter((k) => k.startsWith("trusted:")),
      ),
    ].slice(0, 500);
    setFavoriteEntityKeys(normalized);
    if (!isAuthenticated) return;
    if (workosRef.current) {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const res = await fetch("/api/me/favorites", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: normalized }),
        });
        if (!res.ok) setProfileError("Saved favorites could not sync to the server.");
      } catch {
        setProfileError("Saved favorites could not sync to the server.");
      } finally {
        syncingRef.current = false;
      }
      return;
    }
  }

  async function resetDemo() {
    if (workosRef.current && typeof window !== "undefined") {
      clearNavAuthCache();
      const publicBase = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
      const returnTo = encodeURIComponent("/");
      window.location.assign(
        publicBase ? `${publicBase}/sign-out?returnTo=${returnTo}` : `/sign-out?returnTo=${returnTo}`,
      );
      return;
    }
    if (!demoModeEnabled) return;
    const cloudUserId = userId;
    const localKeysToClear = [
      PROFILE_KEY,
      FAV_KEY,
        FAV_ENTITY_KEY,
      AUTH_KEY,
      DEMO_USER_KEY,
      DEMO_ACCOUNT_KEY,
      "top_sponsor_applications_demo",
      "top_trusted_resource_applications_demo",
      "top_community_pending_submissions",
      "top_community_local_approved_posts",
      "top_community_liked_posts",
      "top_community_connection_requests",
      "top-color-scheme",
    ];
    const sessionKeysToClear = ["top-directory-session-v1", "torp-directory-session-v1"];

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
    setFavoriteEntityKeys([]);
    setSavedOrganizations([]);
    setProfileError("");
    setIsAuthenticated(false);
    setAuthProvider(null);
    setSessionKind("demo");
    clearDemoAccount();
    const nextUserId = typeof window !== "undefined" ? getOrCreateDemoUserId() : "demo-user";
    setUserId(nextUserId);
    workosRef.current = false;
    if (supabase && cloudUserId) {
      try {
        await replaceSavedOrgEinList(supabase, cloudUserId, []);
      } catch {
        /* local reset still applies */
      }
    }
  }

  async function createAccount({ firstName = "", lastName = "", email = "", password = "", avatarUrl = "" } = {}) {
    if (!demoModeEnabled) {
      return { ok: false, message: "Demo account creation is disabled in this environment. Use WorkOS sign-up." };
    }
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
      membershipTier: "support",
      membershipBillingStatus: "none",
      banner: "",
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

  async function signInWithCredentials({ email = "", password = "" } = {}) {
    if (!demoModeEnabled) {
      return { ok: false, message: "Demo sign-in is disabled in this environment. Use WorkOS sign-in." };
    }
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
      const storedEntityFavs = loadJson(FAV_ENTITY_KEY, []);
      const rawEntityFavs = Array.isArray(storedEntityFavs) ? storedEntityFavs : [];
      setFavoriteEntityKeys(
        [...new Set(rawEntityFavs.map((k) => String(k || "").trim().toLowerCase()).filter((k) => k.startsWith("trusted:")))].slice(0, 500),
      );
      setIsAuthenticated(true);
      setAuthProvider(AUTH_PROVIDER.DEMO_EMAIL);
      setSessionKind("demo");
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
      setSessionKind("demo");
      return { ok: true };
    }

    return { ok: false, message: "No account found for this email. Create an account first." };
  }

  function signOut() {
    if (workosRef.current && typeof window !== "undefined") {
      clearNavAuthCache();
      setWorkOSAccountEmail("");
      const publicBase = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
      const returnTo = encodeURIComponent("/");
      const signOutUrl = publicBase
        ? `${publicBase}/sign-out?returnTo=${returnTo}`
        : `/sign-out?returnTo=${returnTo}`;
      window.location.assign(signOutUrl);
      return;
    }
    clearNavAuthCache();
    setWorkOSAccountEmail("");
    setIsAuthenticated(false);
    setAuthProvider(null);
    setProfile(createInitialProfile());
    setFavoriteEins([]);
    setFavoriteEntityKeys([]);
    setSavedOrganizations([]);
    setSessionKind("none");
    setEntitlements(entitlementsFromApi(null));
  }

  async function deleteAccount({ confirmPhrase = "" } = {}) {
    if (workosRef.current && typeof window !== "undefined") {
      try {
        const res = await fetch("/api/me/account", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmPhrase }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            message:
              String(data?.message || "").trim() ||
              (data?.error === "confirmation_required"
                ? 'Type DELETE in the confirmation field to permanently delete your account.'
                : "Could not delete your account. Try again or contact support."),
          };
        }
        clearNavAuthCache();
        setWorkOSAccountEmail("");
        const signOutPath = String(data?.signOutPath || "/sign-out?returnTo=/").trim();
        const publicBase = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
        window.location.assign(publicBase ? `${publicBase}${signOutPath}` : signOutPath);
        return { ok: true };
      } catch {
        return { ok: false, message: "Could not delete your account. Check your connection and try again." };
      }
    }

    if (!demoModeEnabled) {
      return { ok: false, message: "Account deletion is only available for signed-in accounts." };
    }
    await resetDemo();
    return { ok: true };
  }

  async function uploadAvatarFile(file) {
    if (!file || !workosRef.current) return { ok: false, message: "Avatar upload requires a signed-in cloud account." };
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/me/avatar", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = String(data?.error || "").trim();
        const message =
          code === "server_storage_unavailable" || res.status === 503
            ? "Photo upload is temporarily unavailable (server storage)."
            : data.message || data.error || "Upload failed.";
        return { ok: false, message };
      }
      let avatarUrl = String(data.photoUrl || "").trim();
      if (data.profile) {
        const mapped = profileFromApiDto(
          mergeAccountEmailIntoProfileDto(data.profile, { email: workOSAccountEmail || undefined }),
        );
        setProfile(mapped);
        avatarUrl = mapped.avatarUrl || avatarUrl;
      }
      return { ok: true, avatarUrl };
    } catch {
      return { ok: false, message: "Upload failed." };
    }
  }

  function toggleFavoriteEin(ein) {
    const id = normalizeEinDigits(ein);
    if (id.length !== 9) return;
    const next = favoriteEins.includes(id) ? favoriteEins.filter((x) => x !== id) : [id, ...favoriteEins];
    setFavoriteEinList(next);
  }

  function toggleFavoriteEntityKey(key) {
    const id = String(key || "").trim().toLowerCase();
    if (!id.startsWith("trusted:")) return;
    if (!entitlements.fullPlatformAccess && !entitlements.isPlatformAdmin && !entitlements.isPrivilegedStaff) {
      return;
    }
    const next = favoriteEntityKeys.includes(id)
      ? favoriteEntityKeys.filter((x) => x !== id)
      : [id, ...favoriteEntityKeys];
    setFavoriteEntityKeyList(next);
  }

  const fullName = useMemo(() => `${profile.firstName} ${profile.lastName}`.trim(), [profile.firstName, profile.lastName]);
  const greetingName = fullName || profile.displayName || "Supporter";
  const membership = useMemo(() => getMembershipMeta(profile.membershipStatus), [profile.membershipStatus]);
  const isMember = useMemo(() => {
    if (sessionKind === "workos") {
      return !!(
        entitlements.podcastMemberContent ||
        entitlements.isPrivilegedStaff ||
        entitlements.isPlatformAdmin
      );
    }
    return membership.isMember;
  }, [
    sessionKind,
    entitlements.podcastMemberContent,
    entitlements.isPrivilegedStaff,
    entitlements.isPlatformAdmin,
    membership.isMember,
  ]);

  return useMemo(
    () => ({
      userId,
      sessionKind,
      authBackend,
      workOSAccountEmail,
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
      favoriteEntityKeys,
      toggleFavoriteEin,
      toggleFavoriteEntityKey,
      setFavoriteEinList,
      savedOrganizations,
      setMembershipStatus,
      resetDemo,
      createAccount,
      signInWithCredentials,
      signOut,
      deleteAccount,
      refreshWorkOSProfile,
      uploadAvatarFile,
      entitlements,
    }),
    [
      userId,
      sessionKind,
      authBackend,
      workOSAccountEmail,
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
      favoriteEntityKeys,
      toggleFavoriteEin,
      toggleFavoriteEntityKey,
      setFavoriteEinList,
      savedOrganizations,
      setMembershipStatus,
      resetDemo,
      createAccount,
      signInWithCredentials,
      signOut,
      deleteAccount,
      refreshWorkOSProfile,
      uploadAvatarFile,
      entitlements,
    ],
  );
}
