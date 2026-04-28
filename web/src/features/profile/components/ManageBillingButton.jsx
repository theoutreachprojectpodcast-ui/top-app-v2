"use client";

import { useState } from "react";

/**
 * Opens Stripe Customer Portal for the signed-in WorkOS user (server uses torp_profiles.stripe_customer_id).
 */
export default function ManageBillingButton({ stripeReady, hasStripeCustomer, variant = "soft" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setError("Billing is not connected in this environment.");
        return;
      }
      if (res.status === 400 && data.error === "no_stripe_customer") {
        setError("Subscribe to a paid plan first, then you can manage billing here.");
        return;
      }
      if (!res.ok || !data.url) {
        setError(data.message || "Could not open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!stripeReady) {
    return (
      <p className="sponsorSectionLead" style={{ marginTop: 8, marginBottom: 0 }}>
        Billing is not fully configured (missing Stripe keys or price IDs). Paid plans are unavailable until your deploy
        sets the required environment variables.
      </p>
    );
  }

  const btnClass = variant === "primary" ? "btnPrimary" : "btnSoft";

  return (
    <div>
      <button type="button" className={btnClass} disabled={busy || !hasStripeCustomer} onClick={openPortal}>
        {busy ? "Opening…" : "Manage billing"}
      </button>
      {!hasStripeCustomer ? (
        <p className="profileDemoResetNote" style={{ marginTop: 8 }}>
          Available after you complete a paid subscription checkout.
        </p>
      ) : null}
      {error ? <p className="applyError">{error}</p> : null}
    </div>
  );
}
