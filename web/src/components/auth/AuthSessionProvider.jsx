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
  const meRes = await fetch("/api/me", { credentials: "include", cache: "no-store" });
  const me = await meRes.json().catch(() => ({}));
  return !!me.authenticated;
}
import { usePathname } from "next/navigation";
import { clearNavAuthCache, readNavAuthCache, writeNavAuthCache } from "@/lib/auth/navAuthCache";

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
    try {
      const [statusRes, meRes] = await Promise.all([
        fetch("/api/auth/status", { credentials: "include" }),
        fetch("/api/me", { credentials: "include", cache: "no-store" }),
      ]);
      const status = await statusRes.json().catch(() => ({}));
      const me = await meRes.json().catch(() => ({}));
      const workos = !!status.workos;
      let authenticated = !!me.authenticated;
      if (soft && sessionRef.current.authenticated && !authenticated) {
        await new Promise((r) => setTimeout(r, 150));
        authenticated = await fetchMeAuthenticated();
      }
      writeNavAuthCache(authenticated, workos);
      setState({ loading: false, authenticated, workos });
    } catch {
      setState((prev) => ({
        loading: false,
        authenticated: soft ? prev.authenticated : false,
        workos: soft ? prev.workos : false,
      }));
      if (!soft) clearNavAuthCache();
    }
  }, []);

  useEffect(() => {
    void refresh({ soft: false });
  }, [refresh]);

  useEffect(() => {
    if (skipFirstPathnameEffect.current) {
      skipFirstPathnameEffect.current = false;
      return;
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
