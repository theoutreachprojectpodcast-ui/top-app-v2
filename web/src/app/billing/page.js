"use client";

import { Suspense } from "react";
import ManageBillingButton from "@/features/profile/components/ManageBillingButton";
import NativeAccountBillingNotice from "@/components/capacitor/NativeAccountBillingNotice";
import MobileReturnToAppPanel from "@/components/capacitor/MobileReturnToAppPanel";
import { useProfileData } from "@/features/profile/ProfileDataProvider";
import { requiresExternalWebAccountFlow, openWebBilling } from "@/lib/capacitor/webAccountRedirects";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import Link from "next/link";

function BillingHubInner() {
  const { isAuthenticated, loadingProfile, profile, authBackend, sessionKind } = useProfileData();
  const externalOnly = requiresExternalWebAccountFlow();
  const inNativeApp = isCapacitorNative();

  if (externalOnly && inNativeApp) {
    return (
      <main className="shell legalPageRoute">
        <MobileReturnToAppPanel
          title="Billing is managed on the web"
          message="Payment methods, invoices, and subscription changes open on the TOP website in your browser."
        />
        <div className="row wrap">
          <button type="button" className="btnPrimary" onClick={() => void openWebBilling()}>
            Open billing on web
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell legalPageRoute">
      <section className="panel legalPage">
        <h1>Billing</h1>
        <NativeAccountBillingNotice />
        <p>
          Manage payment methods, invoices, upgrades, downgrades, and cancellations through the Stripe customer
          portal on the web. The mobile app does not store card details.
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
