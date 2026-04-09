"use client";

import Link from "next/link";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import IconWrap from "@/components/shared/IconWrap";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

/**
 * @param {{ showThemeToggle?: boolean, section?: "lead" | "auth" | "all" }} props
 * - lead: theme toggle + Become a Sponsor (left header)
 * - auth: profile / sign-in cluster (right header)
 * - all: single row (legacy)
 */
export default function SubpageTopbarActions({ showThemeToggle = true, section = "all" }) {
  const session = useAuthSession();
  const authState =
    section === "lead"
      ? { loading: false, workos: false, authenticated: false }
      : { loading: session.loading, workos: session.workos, authenticated: session.authenticated };

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
