"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MembershipBillingCenter from "@/features/membership/components/MembershipBillingCenter";
import { useProfileData } from "@/features/profile/ProfileDataProvider";

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

  const lead = useMemo(() => {
    if (!isAuthenticated) {
      return "Sign in or create an account to activate Support Membership ($0.99/yr) or Pro ($5.99/yr).";
    }
    return "Manage Support and Pro memberships. All billing is handled securely through Stripe in the app.";
  }, [isAuthenticated]);

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
        {!isAuthenticated && !loadingProfile ? (
          <div className="row wrap">
            <a className="btnPrimary" href={`/sign-up?returnTo=${encodeURIComponent("/membership/success")}`}>
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
            stripePortalReady={!!authBackend?.stripePortal}
            checkoutReturnPath="/membership/success"
            membershipBillingStatus={profile.membershipBillingStatus}
            stripeCustomerReady={!!profile.stripeCustomerIdSet}
            stripeSubscriptionReady={!!profile.stripeSubscriptionIdSet}
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
