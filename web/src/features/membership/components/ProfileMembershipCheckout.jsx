"use client";

import { useState } from "react";
import {
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
} from "@/features/membership/membershipTiers";
import { navigateToStripeCheckout } from "@/lib/capacitor/billingNavigation";

/**
 * Stripe Checkout for Pro Membership from settings (WorkOS session).
 */
export default function ProfileMembershipCheckout({
  stripeReady,
  missingEnvKeys = [],
  returnPath = "/profile",
  onAfterRedirect,
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function start() {
    setError("");
    setBusy("member");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "member", returnPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        onAfterRedirect?.();
        await navigateToStripeCheckout(data.url);
        return;
      }
      if (res.status === 503 || res.status === 400) {
        setError(
          data.message ||
            "Billing is not configured. Set Stripe env vars (see deployment docs).",
        );
        return;
      }
      setError(data.message || data.error || "Checkout could not start.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setBusy("");
    }
  }

  if (!stripeReady) {
    return (
      <div className="profileMembershipCheckout profileMembershipCheckout--disabled">
        <h4 className="profileMembershipCheckoutTitle">Subscribe</h4>
        <p className="sponsorSectionLead">
          Recurring membership needs a Stripe Pro price ID on the server. Missing or unset:{" "}
          {missingEnvKeys.length ? (
            <code>{missingEnvKeys.join(", ")}</code>
          ) : (
            <>
              <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_PRO_YEARLY</code>
            </>
          )}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="profileMembershipCheckout">
      <h4 className="profileMembershipCheckoutTitle">Subscribe</h4>
      <p className="sponsorSectionLead">
        {PRO_MEMBERSHIP_DISPLAY_NAME} ({PRO_MEMBERSHIP_PRICE_LABEL}) unlocks the full platform. Manage billing in the
        portal after your first checkout.
      </p>
      {error ? <p className="applyError">{error}</p> : null}
      <div className="row wrap" style={{ marginTop: 10 }}>
        <button type="button" className="btnPrimary" disabled={!!busy} onClick={() => void start()}>
          {busy === "member" ? "Redirecting…" : `Pro — ${PRO_MEMBERSHIP_PRICE_LABEL}`}
        </button>
      </div>
    </div>
  );
}
