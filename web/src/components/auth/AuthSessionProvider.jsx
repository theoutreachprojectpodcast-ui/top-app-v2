"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

async function fetchMeAuthenticated() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const meRes = await fetch("/api/me", { credentials: "include", cache: "no-store", signal: controller.signal });
    const me = await meRes.json().catch(() => ({}));
    return !!me.authenticated;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
import { usePathname } from "next/navigation";
import { clearNavAuthCache, readNavAuthCache, writeNavAuthCache } from "@/lib/auth/navAuthCache";
import { profileFromApiDto } from "@/features/profile/mappers";
import { navCacheHasFreeAccess } from "@/lib/membership/appAccess";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { TORP_OAUTH_BROWSER_PENDING } from "@/lib/auth/oauthMobileHandoff";

const AuthSessionContext = createContext({
  loading: true,
  authenticated: false,
  workos: false,
  refresh: async () => {},
});

export function useAuthSession() {
  return useContext(AuthSessionContext);
}

export default function AuthSessionProvider({ children }) {
  const pathname = usePathname();
  const [state, setState] = useState({ loading: true, authenticated: false, workos: false });
  const skipFirstPathnameEffect = useRef(true);
  /** Latest snapshot for soft refresh: avoid spurious “signed out” on navigation/tab focus. */
  const sessionRef = useRef(state);
  useEffect(() => {
    sessionRef.current = state;
  }, [state]);

  /** Apply cached auth before paint to avoid a signed-out flash on client navigations (WorkOS cookie is still canonical). */
  useLayoutEffect(() => {
    const c = readNavAuthCache();
    if (c) {
      setState({ loading: false, authenticated: !!c.authenticated, workos: !!c.workos });
    }
  }, []);

  const refresh = useCallback(async (opts = {}) => {
    const soft = !!opts.soft;
    const cacheBefore = readNavAuthCache();
    const stickyAuthed = sessionRef.current.authenticated || !!cacheBefore?.authenticated;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const fetchOpts = { credentials: "include", signal: controller.signal };
      const [statusRes, meRes] = await Promise.all([
        fetch("/api/auth/status", fetchOpts),
        fetch("/api/me", { ...fetchOpts, cache: "no-store" }),
      ]);
      const status = await statusRes.json().catch(() => ({}));
      const me = await meRes.json().catch(() => ({}));
      const workos = !!status.workos;
      let authenticated = !!me.authenticated;
      if (stickyAuthed && !authenticated) {
        for (const delay of [150, 400, 900, 1600]) {
          await new Promise((r) => setTimeout(r, delay));
          authenticated = await fetchMeAuthenticated();
          if (authenticated) break;
        }
      }
      const profileForAccess = me.profile ? profileFromApiDto(me.profile) : null;
      if (authenticated) {
        writeNavAuthCache(authenticated, workos, {
          hasFreeAccess: authenticated && navCacheHasFreeAccess(profileForAccess, me.entitlements),
        });
        setState({ loading: false, authenticated: true, workos });
        return;
      }
      if (soft && stickyAuthed) {
        setState((prev) => ({
          loading: false,
          authenticated: true,
          workos: prev.workos || !!cacheBefore?.workos || workos,
        }));
        return;
      }
      if (!soft) {
        clearNavAuthCache();
      }
      setState({ loading: false, authenticated: false, workos });
    } catch {
      const cache = readNavAuthCache();
      const preserve = soft || !!cache?.authenticated;
      setState((prev) => ({
        loading: false,
        authenticated: preserve ? prev.authenticated || !!cache?.authenticated : false,
        workos: preserve ? prev.workos || !!cache?.workos : false,
      }));
      if (!soft && !cache?.authenticated) clearNavAuthCache();
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void refresh({ soft: false });
  }, [refresh]);

  const lastPathRefreshRef = useRef(0);

  useEffect(() => {
    if (skipFirstPathnameEffect.current) {
      skipFirstPathnameEffect.current = false;
      return;
    }
    if (isCapacitorNative()) {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TORP_OAUTH_BROWSER_PENDING) === "1") {
        return;
      }
      const now = Date.now();
      if (now - lastPathRefreshRef.current < 8000) return;
      lastPathRefreshRef.current = now;
    }
    void refresh({ soft: true });
  }, [pathname, refresh]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") void refresh({ soft: true });
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  /** Bump sliding idle cookie on real pointer activity (throttled); complements proxy on navigations. */
  useEffect(() => {
    let last = 0;
    const throttleMs = 120_000;
    function ping() {
      const now = Date.now();
      if (now - last < throttleMs) return;
      last = now;
      void fetch("/api/auth/activity", { method: "POST", credentials: "include", keepalive: true }).catch(() => {});
    }
    window.addEventListener("pointerdown", ping, { passive: true });
    return () => window.removeEventListener("pointerdown", ping);
  }, []);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
