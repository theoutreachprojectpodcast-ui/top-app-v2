"use client";

import Link from "next/link";
import { useState } from "react";
import MembershipTierArt from "@/features/membership/components/MembershipTierArt";
import ProfileMembershipCheckout from "@/features/membership/components/ProfileMembershipCheckout";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import {
  MEMBERSHIP_TIER_DEFINITIONS,
  getMembershipTierDefinition,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

/**
 * @param {"profile" | "settings"} surface — profile shows current plan only; settings shows upgrades/options.
 */
export default function MembershipAtAGlance({
  surface = "settings",
  isAuthenticated,
  currentTierKey,
  onSelectTier,
  onRequestSignIn,
  sessionKind = "demo",
  stripeMemberReady = false,
  stripeSponsorSubscriptionReady = false,
  stripeMemberMissingEnv = [],
  checkoutReturnPath = "/profile",
  onCheckoutNavigate,
  membershipBillingStatus = "none",
  stripeCustomerReady = false,
}) {
  const [open, setOpen] = useState(true);
  const current = getMembershipTierDefinition(currentTierKey);
  const tierKey = normalizeMembershipTierKey(currentTierKey);
  const isWorkos = sessionKind === "workos";
  const billingLabel = String(membershipBillingStatus || "none").replace(/_/g, " ");

  if (surface === "profile") {
    if (!isAuthenticated) {
      return (
        <section className="card membershipAtAGlance membershipAtAGlance--profileCompact">
          <h3 className="membershipAtAGlanceProfileTitle">Membership</h3>
          <p className="membershipAtAGlanceSub membershipAtAGlanceSub--profile">
            Sign in to see your active membership and billing status.
          </p>
          <button type="button" className="btnPrimary" onClick={() => onRequestSignIn?.()}>
            Sign in
          </button>
        </section>
      );
    }

    return (
      <section className="card membershipAtAGlance membershipAtAGlance--profileCompact">
        <div className="membershipCurrentProfileRow">
          <span className="membershipAtAGlanceArt membershipAtAGlanceArt--profile" aria-hidden="true">
            <MembershipTierArt tierId={tierKey} />
          </span>
          <div className="membershipCurrentProfileCopy">
            <h3 className="membershipAtAGlanceProfileTitle">Membership</h3>
            <p className="membershipAtAGlanceSub membershipAtAGlanceSub--profile">
              Current plan: <strong>{current.label}</strong>
            </p>
            <p className="membershipBillingStatusLine">Billing status: {billingLabel}</p>
            <p className="membershipTierFootnote membershipTierFootnote--profile">{current.hint}</p>
          </div>
        </div>
        {isWorkos ? (
          <div className="membershipCurrentProfileBilling">
            <ManageBillingButton stripeReady={!!stripeMemberReady} hasStripeCustomer={!!stripeCustomerReady} />
          </div>
        ) : null}
        <div className="membershipCurrentProfileSettingsLink">
          <Link className="btnSoft" href="/settings#account-membership">
            Membership &amp; billing in Settings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card membershipAtAGlance">
      <button type="button" className="membershipAtAGlanceHead" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="membershipAtAGlanceHeadMain">
          <span className="membershipAtAGlanceArt" aria-hidden="true">
            <MembershipTierArt tierId={tierKey} />
          </span>
          <div>
            <h3>Membership &amp; billing</h3>
            <p className="membershipAtAGlanceSub">
              {isAuthenticated ? (
                <>
                  Current: <strong>{current.label}</strong> · Billing: {billingLabel}
                </>
              ) : (
                <>Choose how you want to participate — sign in to activate saves and profile.</>
              )}
            </p>
          </div>
        </div>
        <span className="membershipAtAGlanceChevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="membershipAtAGlanceBody">
          {!isAuthenticated ? (
            <div className="membershipTierChoiceGrid">
              {MEMBERSHIP_TIER_DEFINITIONS.map((tier) => (
                <button key={tier.id} type="button" className="membershipTierCard" onClick={() => onRequestSignIn?.()}>
                  <span className="membershipTierCardTitle">{tier.label}</span>
                  {tier.priceLabel ? (
                    <span className="membershipTierCardPrice">{tier.priceLabel}</span>
                  ) : null}
                  <span className="membershipTierCardHint">{tier.hint}</span>
                </button>
              ))}
            </div>
          ) : null}

          {isAuthenticated && isWorkos ? (
            <div className="membershipStripePanel">
              <ProfileMembershipCheckout
                stripeReady={stripeMemberReady}
                stripeSponsorSubscriptionReady={stripeSponsorSubscriptionReady}
                missingEnvKeys={stripeMemberMissingEnv}
                returnPath={checkoutReturnPath}
                onAfterRedirect={onCheckoutNavigate}
              />
              <div className="membershipSettingsBillingRow">
                <ManageBillingButton stripeReady={!!stripeMemberReady} hasStripeCustomer={!!stripeCustomerReady} />
              </div>
            </div>
          ) : null}

          {isAuthenticated ? (
            <details className="membershipBenefitsDetails" open>
              <summary>Benefits for {current.shortLabel}</summary>
              <ul className="membershipBenefitsList">
                {current.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {isAuthenticated && !isWorkos ? (
            <div className="membershipTierAdminRow">
              <span className="membershipDemoLabel">Demo: switch tier</span>
              <div className="row wrap membershipTierPills">
                {MEMBERSHIP_TIER_DEFINITIONS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    className={`btnSoft membershipTierPill ${normalizeMembershipTierKey(currentTierKey) === tier.id ? "isCurrent" : ""}`}
                    onClick={() => onSelectTier?.(tier.id)}
                  >
                    {tier.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
