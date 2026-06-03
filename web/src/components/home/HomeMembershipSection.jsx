"use client";

import Link from "next/link";
import { listMembershipPlansForHome } from "@/lib/billing/sponsorOpportunities";
import {
  formatMembershipBillingStatus,
  resolveHomeMembershipPlanView,
} from "@/features/membership/membershipAccountDisplay";
import { getMembershipTierDefinition } from "@/features/membership/membershipTiers";
import "@/components/home/home-membership-section.css";

/**
 * Homepage membership — guest sees all tiers; signed-in users see current plan + upgrades only.
 */
export default function HomeMembershipSection({
  isAuthenticated,
  loadingAccount = false,
  currentTierKey = "none",
  accountEmail = "",
  membershipLabel = "",
  membershipBillingStatus = "none",
  onJoinFree,
  onUpgradeTier,
  onRequestSignIn,
  onGoToProfile,
}) {
  const plans = listMembershipPlansForHome();
  const current = getMembershipTierDefinition(currentTierKey);
  const billingLabel = formatMembershipBillingStatus(membershipBillingStatus);
  const visiblePlans = plans.filter((plan) => {
    const view = resolveHomeMembershipPlanView(plan.tierKey, currentTierKey, isAuthenticated);
    return view.visible;
  });

  function handleCta(plan) {
    const view = resolveHomeMembershipPlanView(plan.tierKey, currentTierKey, isAuthenticated);
    if (view.ctaMode === "current") {
      onGoToProfile?.();
      return;
    }
    if (!isAuthenticated || view.ctaMode === "signin") {
      onRequestSignIn?.();
      return;
    }
    if (plan.tierKey === "none" || !plan.checkoutTier) {
      onJoinFree?.();
      return;
    }
    onUpgradeTier?.(plan.checkoutTier);
  }

  function ctaLabel(plan) {
    const view = resolveHomeMembershipPlanView(plan.tierKey, currentTierKey, isAuthenticated);
    if (view.ctaMode === "current") return "Your current plan";
    if (!isAuthenticated || view.ctaMode === "signin") {
      return plan.tierKey === "none" ? "Sign in — join free" : `Sign in — ${plan.cta}`;
    }
    return plan.cta;
  }

  const title = isAuthenticated ? "Your membership" : "Become a member";
  const lead = isAuthenticated
    ? loadingAccount
      ? "Loading your account and membership…"
      : `Signed in as ${accountEmail || "your account"}. Current plan: ${membershipLabel || current.label}. Billing: ${billingLabel}.`
    : "Support the mission with a free account or a recurring membership.";

  return (
    <section
      className="homeMembershipSection"
      id={isAuthenticated ? "profile-membership-plans" : undefined}
      aria-labelledby="home-membership-heading"
    >
      <div className="homeMembershipSection__header">
        <h2 id="home-membership-heading" className="homeMembershipSection__title">
          {title}
        </h2>
        <p className="homeMembershipSection__lead">{lead}</p>
      </div>

      {isAuthenticated && !loadingAccount ? (
        <div className="homeMembershipSection__account" role="status">
          <p className="homeMembershipSection__accountLine">
            <strong>Account</strong> {accountEmail || "—"}
          </p>
          <p className="homeMembershipSection__accountLine">
            <strong>Plan</strong> {membershipLabel || current.label}
            <span className="homeMembershipSection__accountBilling"> · {billingLabel}</span>
          </p>
          {onGoToProfile ? (
            <Link className="btnSoft homeMembershipSection__manageLink" href="/profile">
              Manage on profile
            </Link>
          ) : null}
        </div>
      ) : null}

      {isAuthenticated && visiblePlans.length === 0 && !loadingAccount ? (
        <p className="homeMembershipSection__maxTier">
          You are on <strong>{membershipLabel || current.label}</strong>. Manage billing and sponsor packages on your{" "}
          <Link href="/profile">profile</Link> or <Link href="/settings">settings</Link>.
        </p>
      ) : null}

      {visiblePlans.length > 0 ? (
        <div className="homeMembershipSection__grid">
          {visiblePlans.map((plan) => {
            const view = resolveHomeMembershipPlanView(plan.tierKey, currentTierKey, isAuthenticated);
            return (
              <article
                key={plan.tierKey}
                className={`homeMembershipSection__card${view.isCurrent ? " homeMembershipSection__card--current" : ""}`}
              >
                {view.isCurrent ? (
                  <span className="homeMembershipSection__currentBadge">Current plan</span>
                ) : null}
                <h3 className="homeMembershipSection__cardTitle">{plan.label}</h3>
                <p className="homeMembershipSection__price">{plan.priceLabel}</p>
                <p className="homeMembershipSection__desc">{plan.description}</p>
                <button
                  type="button"
                  className={`${view.isCurrent ? "btnSoft" : "btnPrimary"} homeMembershipSection__cta`}
                  onClick={() => handleCta(plan)}
                  disabled={loadingAccount || view.ctaMode === "current"}
                >
                  {loadingAccount ? "Loading…" : ctaLabel(plan)}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
