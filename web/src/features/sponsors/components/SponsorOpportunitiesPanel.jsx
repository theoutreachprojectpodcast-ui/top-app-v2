"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { navigateToStripeCheckout } from "@/lib/capacitor/billingNavigation";

/**
 * Compact sponsor opportunity list for the Become a sponsor modal.
 */
export default function SponsorOpportunitiesPanel({ checkoutReturnPath = "/sponsors", onSelectTier }) {
  const [opportunities, setOpportunities] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/sponsor-opportunities", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
    } catch {
      setError("Could not load sponsor opportunities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCheckout(tier, sponsorPackageId) {
    setError("");
    setBusy(tier + (sponsorPackageId || ""));
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, returnPath: checkoutReturnPath, sponsorPackageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        await navigateToStripeCheckout(data.url);
        return;
      }
      if (data.error === "use_podcast_checkout" && data.podcastTierId) {
        const pr = await fetch("/api/billing/podcast-sponsor-checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ podcastTierId: data.podcastTierId, returnPath: checkoutReturnPath }),
        });
        const pd = await pr.json().catch(() => ({}));
        if (pd.url) {
          await navigateToStripeCheckout(pd.url);
          return;
        }
      }
      if (data.error === "use_sponsor_application") {
        const tid = data.missionTierId || data.podcastTierId || "";
        if (tid && typeof onSelectTier === "function") onSelectTier(tid);
        return;
      }
      setError(data.message || data.error || "Checkout could not start.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setBusy("");
    }
  }

  const packageOpportunities = opportunities.filter((opp) => opp.family !== "account_sponsor");

  if (loading) {
    return (
      <section className="card sponsorSection sponsorSection--modalInset">
        <h4 className="missionPartnerPackagesModal__sectionTitle">Sponsor opportunities</h4>
        <p className="sponsorSectionLead">Loading packages…</p>
      </section>
    );
  }

  if (!packageOpportunities.length) return null;

  return (
    <section className="card sponsorSection sponsorSection--modalInset sponsorOpportunitiesSection">
      <div className="sponsorSectionHead">
        <h4 className="missionPartnerPackagesModal__sectionTitle">Sponsor opportunities</h4>
        <span className="sponsorFeaturedValuePill">Six packages</span>
      </div>
      <p className="sponsorSectionLead">
        Mission partners and podcast sponsors — select a package to focus the application form, or use checkout when
        Stripe is enabled.
      </p>
      {error ? (
        <p className="applyError" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="sponsorOpportunitiesSection__list">
        {packageOpportunities.map((opp) => (
          <li key={opp.id} className="sponsorOpportunitiesSection__item">
            <div className="sponsorOpportunitiesSection__itemHead">
              <strong>{opp.name}</strong>
              <span className="sponsorOpportunitiesSection__meta">
                {opp.amountLabel} · {opp.familyLabel}
              </span>
            </div>
            <p className="membershipTierCardHint">{opp.spotlight}</p>
            <div className="row wrap">
              <button type="button" className="btnSoft" onClick={() => onSelectTier?.(opp.missionTierId || opp.podcastTierId || opp.id)}>
                Select package
              </button>
              {opp.checkoutKind === "subscription" ? (
                <button
                  type="button"
                  className="btnSoft"
                  disabled={!!busy}
                  onClick={() => startCheckout("sponsor", opp.id)}
                >
                  Subscribe
                </button>
              ) : opp.checkoutKind === "one_time" && opp.stripeConfigured ? (
                <button
                  type="button"
                  className="btnSoft"
                  disabled={!!busy}
                  onClick={() => startCheckout("sponsor", opp.id)}
                >
                  Checkout
                </button>
              ) : (
                <button
                  type="button"
                  className="btnSoft"
                  onClick={() => onSelectTier?.(opp.missionTierId || opp.podcastTierId || opp.id)}
                >
                  Apply
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="sponsorSectionLead">
        Monthly Sponsor Membership (account tier) is separate from these packages — manage it on{" "}
        <Link href="/profile">Profile</Link>.
      </p>
    </section>
  );
}
