"use client";

import { listMembershipPlansForHome } from "@/lib/billing/sponsorOpportunities";
import "@/components/home/home-membership-section.css";

/**
 * Compact homepage “Become a member” tier cards.
 */
export default function HomeMembershipSection({
  isAuthenticated,
  onJoinFree,
  onUpgradeTier,
  onRequestSignIn,
}) {
  const plans = listMembershipPlansForHome();

  function handleCta(plan) {
    if (!isAuthenticated) {
      onRequestSignIn?.();
      return;
    }
    if (plan.tierKey === "none" || !plan.checkoutTier) {
      onJoinFree?.();
      return;
    }
    onUpgradeTier?.(plan.checkoutTier);
  }

  return (
    <section className="homeMembershipSection" aria-labelledby="home-membership-heading">
      <div className="homeMembershipSection__header">
        <h2 id="home-membership-heading" className="homeMembershipSection__title">
          Become a member
        </h2>
        <p className="homeMembershipSection__lead">
          Support the mission with a free account or a recurring membership.
        </p>
      </div>
      <div className="homeMembershipSection__grid">
        {plans.map((plan) => (
          <article key={plan.tierKey} className="homeMembershipSection__card">
            <h3 className="homeMembershipSection__cardTitle">{plan.label}</h3>
            <p className="homeMembershipSection__price">{plan.priceLabel}</p>
            <p className="homeMembershipSection__desc">{plan.description}</p>
            <button type="button" className="btnPrimary homeMembershipSection__cta" onClick={() => handleCta(plan)}>
              {plan.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
