"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MembershipBillingCenter from "@/features/membership/components/MembershipBillingCenter";
import NativeAccountBillingNotice from "@/components/capacitor/NativeAccountBillingNotice";
import MobileReturnToAppPanel from "@/components/capacitor/MobileReturnToAppPanel";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { requiresExternalWebAccountFlow, openWebSignup, openWebMembership } from "@/lib/capacitor/webAccountRedirects";
import { isCapacitorNative } from "@/lib/capacitor/platform";

function MembershipHubInner() {
  const searchParams = useSearchParams();
  const tierHint = searchParams.get("tier") || "";
  const {
    isAuthenticated,
    loadingProfile,
    profile,
    sessionKind,
    authBackend,
    refreshWorkOSProfile,
  } = useProfileData();

  const inNativeApp = isCapacitorNative();
  const externalOnly = requiresExternalWebAccountFlow();

  const lead = useMemo(() => {
    if (externalOnly) {
      return "You opened membership on the TOP website. Complete checkout here in your browser, then return to the app and tap Refresh account status.";
    }
    if (!isAuthenticated) {
      return "Sign in or create an account to choose Support, Pro, or Sponsor membership. Billing is handled securely on the web via Stripe.";
    }
    return "Choose a plan below. Subscriptions are billed through Stripe on the web — not through Apple in-app purchase.";
  }, [externalOnly, isAuthenticated]);

  if (externalOnly && inNativeApp) {
    return (
      <main className="shell legalPageRoute">
        <MobileReturnToAppPanel
          title="Open membership in your browser"
          message="Membership checkout is not available inside the app WebView. Use the button below to continue on the TOP website in Safari or Chrome."
        />
        <div className="row wrap">
          <button type="button" className="btnPrimary" onClick={() => void openWebMembership({ tier: tierHint || undefined })}>
            Continue to membership on web
          </button>
          {!isAuthenticated ? (
            <button type="button" className="btnSoft" onClick={() => void openWebSignup()}>
              Create account on web
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="shell legalPageRoute">
      <section className="panel legalPage">
        <h1>Membership</h1>
        <p>{lead}</p>
        {tierHint ? (
          <p className="sponsorSectionLead">
            Selected tier: <strong>{tierHint}</strong>
          </p>
        ) : null}
        <NativeAccountBillingNotice />
        {!isAuthenticated && !loadingProfile ? (
          <div className="row wrap">
            <a className="btnPrimary" href={`/sign-up?returnTo=${encodeURIComponent("/membership/success?mobileReturn=account")}`}>
              Create account
            </a>
            <a className="btnSoft" href={`/login?returnTo=${encodeURIComponent("/membership")}`}>
              Sign in
            </a>
          </div>
        ) : null}
        {isAuthenticated ? (
          <MembershipBillingCenter
            isAuthenticated={isAuthenticated}
            currentTierKey={profile.membershipStatus}
            sessionKind={sessionKind}
            stripeMemberReady={!!authBackend?.stripe}
            stripeSponsorSubscriptionReady={!!authBackend?.stripeSponsorSubscription}
            checkoutReturnPath="/membership/success"
            membershipBillingStatus={profile.membershipBillingStatus}
            stripeCustomerReady={!!profile.stripeCustomerIdSet}
            onCheckoutNavigate={() => refreshWorkOSProfile()}
            defaultExpanded
          />
        ) : null}
      </section>
    </main>
  );
}

export default function MembershipPage() {
  return (
    <Suspense fallback={<main className="shell"><p>Loading membership…</p></main>}>
      <MembershipHubInner />
    </Suspense>
  );
}
