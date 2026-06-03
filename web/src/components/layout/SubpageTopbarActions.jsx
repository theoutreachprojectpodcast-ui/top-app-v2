"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthSessionProvider";
import { readNavAuthCache } from "@/lib/auth/navAuthCache";
import IconWrap from "@/components/shared/IconWrap";
import HeaderNotificationBell from "@/components/layout/HeaderNotificationBell";
import HeaderAccountMenu from "@/components/layout/HeaderAccountMenu";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { membershipAccountMenuHint } from "@/features/membership/membershipAccountDisplay";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import { workosSignInLink, workosSignUpHref } from "@/lib/auth/workosReturnTo";

const SPONSOR_ICON = "M4 6h16v12H4z M4 10h16";

/**
 * @param {{ section?: "lead" | "auth" | "authNotifications" | "authMenu" | "all" }} props
 * - lead: Become a Sponsor (left header); theme toggle lives in `AppHeaderBrand`
 * - auth: notification bell + account / sign-in (right header)
 * - authNotifications: bell only (podcast mobile left corner)
 * - authMenu: account menu or sign-in CTAs without bell
 * - all: single row (legacy)
 */
export default function SubpageTopbarActions({ section = "all" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loadingProfile, fullName, signOut, isAuthenticated, workOSAccountEmail } = useProfileData();
  /** Avoid useSearchParams here (static routes like /contact must not CSR-bailout without Suspense). */
  const rememberDevice = readRememberDevicePref();
  const signInReturnFallback = pathname?.startsWith("/podcasts") ? pathname : "/";
  const workosSignInHereHref = workosSignInLink(pathname, null, signInReturnFallback, { rememberDevice });
  const workosOnboardingSignUpHref = workosSignUpHref("/onboarding", { rememberDevice });
  const legacySignUpHref =
    pathname && pathname !== "/"
      ? `/?signin=1&signup=1&returnTo=${encodeURIComponent(pathname)}`
      : "/?signin=1&signup=1";
  const legacySignInHref =
    pathname && pathname !== "/"
      ? `/?signin=1&returnTo=${encodeURIComponent(pathname)}`
      : "/?signin=1";

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

  const authed = authState.authenticated || isAuthenticated;
  const authLoading =
    authState.loading || (authed && loadingProfile);
  const accountMenuHint = membershipAccountMenuHint({
    isAuthenticated: authed,
    tierKey: profile?.membershipStatus,
    billingStatus: profile?.membershipBillingStatus,
  });
  const accountEmail = profile?.email || workOSAccountEmail || "";

  const authBlock =
    authLoading ? (
      <span className="subpageAuthActionsPlaceholder" aria-hidden="true" />
    ) : authed ? (
      <>
        <HeaderNotificationBell skipSessionGate />
        <HeaderAccountMenu
          avatarSrc={profile?.avatarUrl || emptyProfileAvatarUrl()}
          displayName={fullName}
          email={accountEmail}
          membershipHint={accountMenuHint}
          ariaLabel={`Account menu for ${fullName || accountEmail || "signed-in user"}`}
          onProfile={() => router.push("/profile")}
          onSettings={() => router.push("/settings")}
          onMembership={() => router.push("/profile")}
          onSavedItems={() => router.push("/profile")}
          onSignOut={signOut}
        />
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
        <Link className="btnSoft sponsorBtn" href={legacySignUpHref}>
          Create account
        </Link>
        <Link className="btnSoft sponsorBtn" href={legacySignInHref}>
          Sign in
        </Link>
      </>
    );

  const authNotificationsBlock =
    authLoading ? null : authed ? <HeaderNotificationBell skipSessionGate /> : null;

  const authMenuBlock =
    authLoading ? (
      <span className="subpageAuthActionsPlaceholder" aria-hidden="true" />
    ) : authed ? (
      <HeaderAccountMenu
        avatarSrc={profile?.avatarUrl || emptyProfileAvatarUrl()}
        displayName={fullName}
        email={accountEmail}
        membershipHint={accountMenuHint}
        ariaLabel={`Account menu for ${fullName || accountEmail || "signed-in user"}`}
        onProfile={() => router.push("/profile")}
        onSettings={() => router.push("/settings")}
        onMembership={() => router.push("/profile")}
        onSavedItems={() => router.push("/profile")}
        onSignOut={signOut}
      />
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
        <Link className="btnSoft sponsorBtn" href={legacySignUpHref}>
          Create account
        </Link>
        <Link className="btnSoft sponsorBtn" href={legacySignInHref}>
          Sign in
        </Link>
      </>
    );

  if (section === "lead") {
    return sponsorLink;
  }

  if (section === "authNotifications") {
    return authNotificationsBlock;
  }

  if (section === "authMenu") {
    return authMenuBlock;
  }

  if (section === "auth") {
    return authBlock;
  }

  return (
    <>
      {sponsorLink}
      {authBlock}
    </>
  );
}
