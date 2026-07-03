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

  const packageOpportunities = opportunities.filter((opp) => opp.family !== "account_sponsor" && !opp.podcastTierId);

  return (
    <section className="card sponsorSection sponsorOpportunitiesSection" id="sponsor-opportunities">
      <div className="sponsorSectionHead">
        <h3>Sponsor opportunities</h3>
        <span className="sponsorFeaturedValuePill">Main platform</span>
      </div>
      <p className="sponsorSectionLead">
        Explore mission partner, foundational, and impact packages for the main Outreach Project platform. Podcast
        packages are on the <Link href="/podcasts">Podcast hub</Link>.
      </p>
      {loading ? <p className="sponsorSectionLead">Loading opportunities…</p> : null}
      {error ? (
        <p className="applyError" role="alert">
          {error}
        </p>
      ) : null}
      {packageOpportunities.length > 0 ? (
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
              {opp.checkoutKind === "subscription" ? (
                <button
                  type="button"
                  className="btnSoft"
                  disabled={!!busy}
                  onClick={() => startCheckout("sponsor", opp.id)}
                >
                  Subscribe
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
          Main platform packages are available — use{" "}
          <Link href="/sponsors?apply=1">Start sponsor application</Link> on the Sponsors hub.
        </p>
      ) : null}
      <div className="row wrap sponsorOpportunitiesSection__footer">
        <button type="button" className="btnPrimary" onClick={() => window.location.assign("/sponsors?apply=1")}>
          Apply to be a sponsor
        </button>
      </div>
    </section>
  );
}
