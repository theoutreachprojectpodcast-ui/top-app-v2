"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  mergeAccountEmailIntoProfileDto,
  profileFromApiDto,
  profileFromLegacy,
  toLocalShape,
  toLocalStorageProfile,
} from "@/features/profile/mappers";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { clearNavAuthCache, readNavAuthCache } from "@/lib/auth/navAuthCache";
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

function mapLegacyMembershipToTier(status) {
  const v = String(status || "").toLowerCase();
  if (v === "member" || v === "demo") return "member";
  if (v === "sponsor") return "sponsor";
  if (v === "none" || v === "guest" || v === "") return "free";
  if (v === "supporter" || v === "support") return "support";
  return "support";
}

function profileToApiPatch(p) {
  const patch = {
    firstName: p.firstName,
    lastName: p.lastName,
    displayName: p.displayName || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
    email: p.email,
    bio: p.bio,
    banner: p.banner,
    theme: p.theme,
    avatarUrl: p.avatarUrl,
    identityRole: p.identityRole,
    missionStatement: p.missionStatement,
    organizationAffiliation: p.organizationAffiliation,
    serviceBackground: p.serviceBackground,
    city: p.city,
    state: p.state,
    causes: p.causes,
    skills: p.skills,
    volunteerInterests: p.volunteerInterests,
    supportInterests: p.supportInterests,
    contributionSummary: p.contributionSummary,
    sponsorOrgName: p.sponsorOrgName,
    sponsorWebsite: p.sponsorWebsite,
  };
  const cs = String(p.colorScheme || "").trim().toLowerCase();
  if (cs === "light" || cs === "dark") patch.colorScheme = cs;
  if (p.accountIntent != null && String(p.accountIntent).trim()) {
    patch.accountIntent = String(p.accountIntent).trim();
  }
  return patch;
}

/**
 * Profile + favorites state for the signed-in session. Mount once via `ProfileDataProvider` in the root layout
 * so navigating between `/`, `/profile`, etc. does not remount this hook and wipe cloud profile state.
 */
export function useProfileDataState(supabase) {
  const demoModeEnabled = isDemoModeEnabled();
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const workosRef = useRef(false);
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
  const [savedOrganizations, setSavedOrganizations] = useState([]);
  const [sessionKind, setSessionKind] = useState("none");
  const [authBackend, setAuthBackend] = useState({
    workos: false,
    workosMissingEnv: [],
    stripe: false,
    supabaseServiceRole: false,
  });
  const [entitlements, setEntitlements] = useState({
    podcastMemberContent: false,
    communityStorySubmit: false,
    isPrivilegedStaff: false,
    isPlatformAdmin: false,
  });
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
    if (!workosRef.current) return;
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      if (data.entitlements && typeof data.entitlements === "object") {
        setEntitlements({
          podcastMemberContent: !!data.entitlements.podcastMemberContent,
          communityStorySubmit: !!data.entitlements.communityStorySubmit,
          isPrivilegedStaff: !!data.entitlements.isPrivilegedStaff,
          isPlatformAdmin: !!data.entitlements.isPlatformAdmin,
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
    let cancelled = false;
    async function init() {
      setLoadingProfile(true);
      setProfileError("");
      const cacheNav = typeof window !== "undefined" ? readNavAuthCache() : null;
      try {
        const [statusRes, meRes] = await Promise.all([
          fetch("/api/auth/status", { credentials: "include" }),
          fetch("/api/me", { credentials: "include", cache: "no-store" }),
        ]);
        const status = await statusRes.json();
        let me = await meRes.json();
        if (!me.authenticated && cacheNav?.authenticated) {
          await new Promise((r) => setTimeout(r, 180));
          const meRes2 = await fetch("/api/me", { credentials: "include", cache: "no-store" });
          me = await meRes2.json().catch(() => ({}));
        }
        /* Authenticated but profile null: transient storage/read — avoid replacing with IdP-only stub. */
        if (me.authenticated && (me.profile == null || me.profile === undefined)) {
          for (let attempt = 0; attempt < 2 && me.authenticated && me.profile == null; attempt++) {
            if (cancelled) return;
            await new Promise((r) => setTimeout(r, 160 * (attempt + 1)));
            const meRetry = await fetch("/api/me", { credentials: "include", cache: "no-store" });
            me = await meRetry.json().catch(() => ({}));
          }
        }
        if (cancelled) return;
        setAuthBackend({
          workos: !!status.workos,
          workosMissingEnv: Array.isArray(status.workosMissingEnv) ? status.workosMissingEnv : [],
          stripe: !!status.stripe,
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
          if (me.entitlements && typeof me.entitlements === "object") {
            setEntitlements({
              podcastMemberContent: !!me.entitlements.podcastMemberContent,
              communityStorySubmit: !!me.entitlements.communityStorySubmit,
              isPrivilegedStaff: !!me.entitlements.isPrivilegedStaff,
              isPlatformAdmin: !!me.entitlements.isPlatformAdmin,
            });
          }
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
          setProfile(profileFromApiDto(dto));
          setWorkOSAccountEmail(String(me.user?.email || "").trim());
          setProfileSource("cloud");
          const favRes = await fetch("/api/me/saved-orgs", { credentials: "include" });
          const favJson = await favRes.json().catch(() => ({}));
          if (Array.isArray(favJson.eins)) {
            setFavoriteEins(favJson.eins);
          }
          hydratedRef.current = true;
          setLoadingProfile(false);
          return;
        }

        /**
         * Nav cache said we were signed in (last /api/me success), but API now says not — session ended or transient
         * failure after retry. Never load unrelated demo localStorage profile in this branch (shared device bug).
         */
        if (cacheNav?.authenticated) {
          clearNavAuthCache();
          workosRef.current = false;
          setSessionKind("none");
          setIsAuthenticated(false);
          setAuthProvider(null);
          setWorkOSAccountEmail("");
          setProfile(createInitialProfile());
          setFavoriteEins([]);
          setSavedOrganizations([]);
          setEntitlements({
            podcastMemberContent: false,
            communityStorySubmit: false,
            isPrivilegedStaff: false,
            isPlatformAdmin: false,
          });
          hydratedRef.current = true;
          setLoadingProfile(false);
          return;
        }

        workosRef.current = false;
        setWorkOSAccountEmail("");
        setSessionKind(demoModeEnabled ? "demo" : "none");
        const legacy = loadJson(PROFILE_KEY, defaultProfile());
        const storedFavs = loadJson(FAV_KEY, []);
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

  async function persistProfile(next) {
    if (!isAuthenticated) {
      setProfile(next);
      return;
    }
    if (workosRef.current) {
      try {
        const res = await fetch("/api/me/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileToApiPatch(next)),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setProfileError(data.message || data.error || "Profile could not be saved to the server.");
          await refreshWorkOSProfile();
          return;
        }
        if (data.profile) {
          setProfile(
            profileFromApiDto(
              mergeAccountEmailIntoProfileDto(data.profile, {
                email: workOSAccountEmail || undefined,
              }),
            ),
          );
          setProfileError("");
        } else await refreshWorkOSProfile();
      } catch {
        setProfileError("Profile could not be saved to the server.");
        await refreshWorkOSProfile();
      }
      return;
    }
    setProfile(next);
    if (!supabase) return;
    try {
      await upsertProfileByUserId(supabase, userId, next);
    } catch {
      setProfileError("Profile saved locally, but cloud sync failed.");
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

  async function resetDemo() {
    if (workosRef.current && typeof window !== "undefined") {
      clearNavAuthCache();
      window.location.assign("/sign-out?returnTo=/");
      return;
    }
    if (!demoModeEnabled) return;
    const cloudUserId = userId;
    const localKeysToClear = [
      PROFILE_KEY,
      FAV_KEY,
      AUTH_KEY,
      DEMO_USER_KEY,
      DEMO_ACCOUNT_KEY,
      "top_sponsor_applications_demo",
      "top_trusted_resource_applications_demo",
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
      window.location.assign("/sign-out?returnTo=/");
      return;
    }
    clearNavAuthCache();
    setWorkOSAccountEmail("");
    setIsAuthenticated(false);
    setAuthProvider(null);
    setProfile(createInitialProfile());
    setFavoriteEins([]);
    setSavedOrganizations([]);
    setSessionKind("none");
    setEntitlements({
      podcastMemberContent: false,
      communityStorySubmit: false,
      isPrivilegedStaff: false,
      isPlatformAdmin: false,
    });
  }

  async function uploadAvatarFile(file) {
    if (!file || !workosRef.current) return { ok: false, message: "Avatar upload requires a signed-in cloud account." };
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/me/avatar", { method: "POST", credentials: "include", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data.message || data.error || "Upload failed." };
      if (data.profile) {
        setProfile(
          profileFromApiDto(
            mergeAccountEmailIntoProfileDto(data.profile, { email: workOSAccountEmail || undefined }),
          ),
        );
      }
      return { ok: true };
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

  const fullName = useMemo(() => `${profile.firstName} ${profile.lastName}`.trim(), [profile.firstName, profile.lastName]);
  const greetingName = fullName || profile.displayName || "Supporter";
  const membership = useMemo(() => getMembershipMeta(profile.membershipStatus), [profile.membershipStatus]);
  const isMember = useMemo(() => {
    if (sessionKind === "workos") return !!entitlements.communityStorySubmit;
    return membership.isMember;
  }, [sessionKind, entitlements.communityStorySubmit, membership.isMember]);

  return {
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
    toggleFavoriteEin,
    setFavoriteEinList,
    savedOrganizations,
    setMembershipStatus,
    resetDemo,
    createAccount,
    signInWithCredentials,
    signOut,
    refreshWorkOSProfile,
    uploadAvatarFile,
    entitlements,
  };
}
