"use client";

import { useState } from "react";
import {
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { navigateToStripeCheckout } from "@/lib/capacitor/billingNavigation";

/**
 * Polished Pro upgrade prompt — use when a Support member hits a Pro-only feature.
 */
export default function ProMembershipUpgradeCard({
  title = "Pro membership unlocks this feature",
  lead = "Upgrade to post in the community, use premium tools, and access future Pro-exclusive content.",
  returnPath = "/community",
  onDismiss,
  className = "",
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startUpgrade() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "member", returnPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        await navigateToStripeCheckout(data.url);
        return;
      }
      if (data.error === "use_billing_portal") {
        setError(data.message || "Open Manage billing on your profile to change your plan.");
        return;
      }
      setError(data.message || data.error || "Checkout could not start.");
    } catch {
      setError("Network error. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card proMembershipUpgradeCard ${className}`.trim()} aria-labelledby="pro-upgrade-heading">
      <h3 id="pro-upgrade-heading" className="proMembershipUpgradeCard__title">
        {title}
      </h3>
      <p className="sponsorSectionLead proMembershipUpgradeCard__lead">{lead}</p>
      <ul className="proMembershipUpgradeCard__benefits">
        <li>Full community participation and story submission</li>
        <li>Enhanced interactions and premium resource tools</li>
        <li>Priority access to future Pro-exclusive features</li>
      </ul>
      <p className="proMembershipUpgradeCard__price">
        <strong>{PRO_MEMBERSHIP_DISPLAY_NAME}</strong> — {PRO_MEMBERSHIP_PRICE_LABEL}
      </p>
      {error ? (
        <p className="applyError" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row wrap proMembershipUpgradeCard__actions">
        <button type="button" className="btnPrimary" disabled={busy} onClick={() => void startUpgrade()}>
          {busy ? "Redirecting…" : `Upgrade to Pro — ${PRO_MEMBERSHIP_PRICE_LABEL}`}
        </button>
        {onDismiss ? (
          <button type="button" className="btnSoft" disabled={busy} onClick={onDismiss}>
            Not now
          </button>
        ) : null}
      </div>
    </section>
  );
}
