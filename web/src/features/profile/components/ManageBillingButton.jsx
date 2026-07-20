"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { navigateToStripePortal } from "@/lib/capacitor/billingNavigation";

function resolveBillingPortalReturnPath(pathname, explicitReturnPath) {
  if (explicitReturnPath) return explicitReturnPath;
  if (!pathname || !pathname.startsWith("/")) return "/settings";
  if (pathname.startsWith("/settings")) return "/settings";
  if (pathname.startsWith("/billing")) return "/billing";
  if (pathname.startsWith("/profile")) return "/profile";
  if (pathname.startsWith("/membership")) return "/membership";
  return "/settings";
}

/**
 * Opens Stripe Customer Portal for the signed-in WorkOS user.
 * Server resolves or creates `top_profiles.stripe_customer_id` when missing.
 */
export default function ManageBillingButton({
  stripeReady,
  hasStripeCustomer,
  hasStripeSubscription = false,
  variant = "soft",
  returnPath,
  onOpened,
  onReturned,
}) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const billingHint =
    hasStripeCustomer || hasStripeSubscription
      ? null
      : "Opens Stripe to manage payment methods, invoices, and your subscription when you have one.";

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      const portalReturnPath = resolveBillingPortalReturnPath(pathname, returnPath);
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: portalReturnPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setError(
          data.message ||
            (data.error === "billing_not_configured"
              ? "Billing is not connected in this environment."
              : "Billing portal is unavailable. Try again later or contact support."),
        );
        return;
      }
      if (!res.ok || !data.url) {
        setError(data.message || "Could not open billing portal.");
        return;
      }
      onOpened?.();
      await navigateToStripePortal(data.url, { onReturned });
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!stripeReady) {
    return (
      <p className="sponsorSectionLead" style={{ marginTop: 8, marginBottom: 0 }}>
        Billing is not fully configured (missing Stripe secret key). Paid plans and the customer portal are unavailable
        until your deploy sets the required environment variables.
      </p>
    );
  }

  const btnClass = variant === "primary" ? "btnPrimary" : "btnSoft";

  return (
    <div>
      <button type="button" className={btnClass} disabled={busy} onClick={openPortal}>
        {busy ? "Opening…" : "Manage billing"}
      </button>
      {billingHint ? (
        <p className="profileDemoResetNote" style={{ marginTop: 8 }}>
          {billingHint}
        </p>
      ) : null}
      {error ? <p className="applyError">{error}</p> : null}
    </div>
  );
}
