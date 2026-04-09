"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import IconWrap from "@/components/shared/IconWrap";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

/**
 * @param {{ showThemeToggle?: boolean, section?: "lead" | "auth" | "all" }} props
 * - lead: theme toggle + Become a Sponsor (left header)
 * - auth: profile / sign-in cluster (right header)
 * - all: single row (legacy)
 */
export default function SubpageTopbarActions({ showThemeToggle = true, section = "all" }) {
  const [authState, setAuthState] = useState({ loading: true, workos: false, authenticated: false });

  useEffect(() => {
    if (section === "lead") return;
    let cancelled = false;
    async function load() {
      try {
        const [statusRes, meRes] = await Promise.all([
          fetch("/api/auth/status"),
          fetch("/api/me", { credentials: "include" }),
        ]);
        const status = await statusRes.json();
        const me = await meRes.json();
        if (cancelled) return;
        setAuthState({
          loading: false,
          workos: !!status.workos,
          authenticated: !!me.authenticated,
        });
      } catch {
        if (!cancelled) setAuthState({ loading: false, workos: false, authenticated: false });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [section]);

  const sponsorLink = (
    <Link className="btnSoft sponsorBtn" href="/sponsors">
      <IconWrap path={SPONSOR_ICON} />
      Become a Sponsor
    </Link>
  );

  const authBlock =
    authState.loading ? (
      <span className="subpageAuthActionsPlaceholder" aria-hidden="true" />
    ) : authState.authenticated ? (
      <Link className="btnSoft sponsorBtn" href="/profile">
        Profile
      </Link>
    ) : authState.workos ? (
      <>
        <Link className="btnSoft sponsorBtn" href="/api/auth/workos/signup?returnTo=/onboarding">
          Create account
        </Link>
        <Link className="btnSoft sponsorBtn" href="/api/auth/workos/signin?returnTo=/">
          Sign in
        </Link>
      </>
    ) : (
      <>
        <Link className="btnSoft sponsorBtn" href="/?signin=1&signup=1">
          Create account
        </Link>
        <Link className="btnSoft sponsorBtn" href="/?signin=1">
          Sign in
        </Link>
      </>
    );

  if (section === "lead") {
    return (
      <>
        {showThemeToggle ? <ColorSchemeToggle /> : null}
        {sponsorLink}
      </>
    );
  }

  if (section === "auth") {
    return authBlock;
  }

  return (
    <>
      {showThemeToggle ? <ColorSchemeToggle /> : null}
      {sponsorLink}
      {authBlock}
    </>
  );
}
