"use client";

import { Suspense } from "react";
import BulkLicensePurchaseForm from "@/features/bulkLicensing/BulkLicensePurchaseForm";
import "@/features/bulkLicensing/bulkLicensing.css";

function BulkLicensesInner() {
  return (
    <main className="bulkLicensingPage">
      <header className="bulkLicensingPage__hero">
        <h1>Bulk Outreach Licenses</h1>
        <p>
          Purchase annual Outreach memberships for your organization. Choose a package, complete your
          organization details, and pay securely through Stripe.
        </p>
      </header>
      <BulkLicensePurchaseForm />
    </main>
  );
}

export default function BulkLicensesPage() {
  return (
    <Suspense fallback={<main className="bulkLicensingPage"><p>Loading…</p></main>}>
      <BulkLicensesInner />
    </Suspense>
  );
}
