"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { navigateToStripeCheckout } from "@/lib/capacitor/billingNavigation";

/**
 * Sponsor packages and partnership opportunities — sponsors page only (not profile billing).
 */
export default function SponsorOpportunitiesSection({ checkoutReturnPath = "/sponsors" }) {
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
        const tid = data.missionTierId || "";
        window.location.assign(`/sponsors?packages=1${tid ? `&tier=${encodeURIComponent(tid)}` : ""}`);
        return;
      }
      setError(data.message || data.error || "Checkout could not start.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card sponsorSection sponsorOpportunitiesSection" id="sponsor-opportunities">
      <div className="sponsorSectionHead">
        <h3>Sponsor opportunities</h3>
        <span className="sponsorFeaturedValuePill">Partnership packages</span>
      </div>
      <p className="sponsorSectionLead">
        Explore sponsorship levels, podcast placements, and mission partner packages. Pricing and benefits come from our
        sponsor programs — not from personal membership billing.
      </p>
      {loading ? <p className="sponsorSectionLead">Loading opportunities…</p> : null}
      {error ? (
        <p className="applyError" role="alert">
          {error}
        </p>
      ) : null}
      {opportunities.length > 0 ? (
        <ul className="sponsorOpportunitiesSection__list">
          {opportunities.map((opp) => (
            <li key={opp.id} className="sponsorOpportunitiesSection__item">
              <div className="sponsorOpportunitiesSection__itemHead">
                <strong>{opp.name}</strong>
                <span className="sponsorOpportunitiesSection__meta">
                  {opp.amountLabel} · {opp.familyLabel}
                </span>
              </div>
              <p className="membershipTierCardHint">{opp.spotlight}</p>
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
                <Link
                  className="btnSoft"
                  href={`/sponsors?packages=1&tier=${encodeURIComponent(opp.missionTierId || opp.id)}`}
                >
                  Apply
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="sponsorSectionLead">
          Mission partner and podcast packages are available — use the buttons above or{" "}
          <Link href="/podcasts?sponsor=1">sponsor the podcast</Link>.
        </p>
      ) : null}
      <div className="row wrap sponsorOpportunitiesSection__footer">
        <button type="button" className="btnPrimary" onClick={() => window.location.assign("/sponsors?packages=1")}>
          View mission partner packages
        </button>
        <Link className="btnSoft" href="/podcasts?sponsor=1">
          Podcast sponsor options
        </Link>
      </div>
    </section>
  );
}
