"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ColorSchemeToggle from "@/components/app/ColorSchemeToggle";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import IconWrap from "@/components/shared/IconWrap";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import { workosSignInLink, workosSignUpHref } from "@/lib/auth/workosReturnTo";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

/**
 * @param {{ showThemeToggle?: boolean, section?: "lead" | "auth" | "all" }} props
 * - lead: theme toggle + Become a Sponsor (left header)
 * - auth: profile / sign-in cluster (right header)
 * - all: single row (legacy)
 */
export default function SubpageTopbarActions({ showThemeToggle = true, section = "all" }) {
  const pathname = usePathname();
  /** Avoid useSearchParams here (static routes like /contact must not CSR-bailout without Suspense). */
  const rememberDevice = readRememberDevicePref();
  const workosSignInHereHref = workosSignInLink(pathname, null, "/", { rememberDevice });
  const workosOnboardingSignUpHref = workosSignUpHref("/onboarding", { rememberDevice });

  const session = useAuthSession();
  const cache = typeof window !== "undefined" ? readNavAuthCache() : null;
  const optimisticAuthed = session.loading && cache?.authenticated;
  const authState =
    section === "lead"
      ? { loading: false, workos: false, authenticated: false }
      : {
          loading: session.loading && !optimisticAuthed,
          workos: session.workos || (!!cache?.workos && optimisticAuthed),
          authenticated: session.authenticated || optimisticAuthed,
        };

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
      <>
        <HeaderNotificationBell variant="subpage" />
        <Link className="btnSoft sponsorBtn" href="/profile">
          Profile
        </Link>
      </>
    ) : authState.workos ? (
      <>
        <Link className="btnSoft sponsorBtn" href={workosOnboardingSignUpHref}>
          Create account
        </Link>
        <Link className="btnSoft sponsorBtn" href={workosSignInHereHref}>
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
