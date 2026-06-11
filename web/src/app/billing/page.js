"use client";

import { Suspense } from "react";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import Link from "next/link";

function BillingHubInner() {
  const { isAuthenticated, loadingProfile, profile, authBackend, sessionKind } = useProfileData();

  return (
    <main className="shell legalPageRoute">
      <section className="panel legalPage">
        <h1>Billing</h1>
        <p>
          Manage payment methods, invoices, upgrades, downgrades, and cancellations through the Stripe customer portal.
        </p>
        {!isAuthenticated && !loadingProfile ? (
          <p>
            <Link href={`/login?returnTo=${encodeURIComponent("/billing")}`}>Sign in</Link> to open billing.
          </p>
        ) : null}
        {isAuthenticated && sessionKind === "workos" ? (
          <ManageBillingButton
            stripeReady={!!authBackend?.stripe}
            hasStripeCustomer={!!profile.stripeCustomerIdSet}
            variant="primary"
          />
        ) : null}
        <p style={{ marginTop: 16 }}>
          <Link className="btnSoft" href="/membership">
            View membership plans
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<main className="shell"><p>Loading billing…</p></main>}>
      <BillingHubInner />
    </Suspense>
  );
}
