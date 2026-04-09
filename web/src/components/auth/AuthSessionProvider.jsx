"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

  const refresh = useCallback(async () => {
    try {
      const [statusRes, meRes] = await Promise.all([
        fetch("/api/auth/status", { credentials: "include" }),
        fetch("/api/me", { credentials: "include", cache: "no-store" }),
      ]);
      const status = await statusRes.json().catch(() => ({}));
      const me = await meRes.json().catch(() => ({}));
      const workos = !!status.workos;
      const authenticated = !!me.authenticated;
      writeNavAuthCache(authenticated, workos);
      setState({ loading: false, authenticated, workos });
    } catch {
      setState({ loading: false, authenticated: false, workos: false });
      clearNavAuthCache();
    }
  }, []);

  useEffect(() => {
    const c = readNavAuthCache();
    if (c) {
      setState({ loading: false, authenticated: !!c.authenticated, workos: !!c.workos });
    }
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
