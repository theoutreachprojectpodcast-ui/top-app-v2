"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "@/features/bulkLicensing/bulkLicensing.css";

function BulkSuccessInner() {
  const searchParams = useSearchParams();
  const organizationId = String(searchParams.get("organizationId") || "").trim();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const load = useCallback(async () => {
    if (!organizationId) {
      setError("Missing organization. Return to bulk licenses and try again.");
      return;
    }
    try {
      const res = await fetch(
        `/api/bulk-licensing/purchase-status?organizationId=${encodeURIComponent(organizationId)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Could not load purchase status.");
        return;
      }
      setStatus(data);
      setError("");
    } catch {
      setError("Network error while confirming your purchase.");
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!status || status.ready || attempts >= 20) return undefined;
    const t = setTimeout(() => {
      setAttempts((n) => n + 1);
      void load();
    }, 2000);
    return () => clearTimeout(t);
  }, [status, attempts, load]);

  if (!organizationId) {
    return (
      <main className="bulkLicensingPage">
        <h1>Purchase confirmation</h1>
        <p className="formError">{error || "Missing organization id."}</p>
        <Link className="btnPrimary" href="/bulk-licenses">
          Back to Bulk Licenses
        </Link>
      </main>
    );
  }

  const org = status?.organization;
  const ready = !!status?.ready;
  const counts = status?.counts || { total: 0, available: 0, redeemed: 0 };

  return (
    <main className="bulkLicensingPage">
      <header className="bulkLicensingPage__hero">
        <h1>{ready ? "Your Outreach licenses are ready" : "Confirming your purchase…"}</h1>
        {!ready ? (
          <p>
            Payment received. We are activating your organization and generating individual license
            seats{attempts ? ` (check ${attempts}/20)` : ""}.
          </p>
        ) : (
          <p>Your organization package is active. Distribute seats from the license dashboard.</p>
        )}
      </header>

      {error ? <p className="formError">{error}</p> : null}

      {org ? (
        <section className="bulkSuccess__summary">
          <p>
            <strong>Organization:</strong> {org.name}
          </p>
          <p>
            <strong>Package:</strong> {status.packageSize || "—"} Annual Licenses
          </p>
          <p>
            <strong>Licenses:</strong> {counts.total} total
          </p>
          <p>
            <strong>Redeemed:</strong> {counts.redeemed}
          </p>
          <p>
            <strong>Available:</strong> {counts.available}
          </p>
          <p>
            <strong>Business Code:</strong> {org.business_code}
          </p>
          <p>
            <strong>Status:</strong> {org.status}
            {status.subscriptionStatus ? ` · subscription ${status.subscriptionStatus}` : ""}
          </p>
        </section>
      ) : (
        <p>Loading organization…</p>
      )}

      <div className="orgLicenseDashboard__actions">
        <Link className="btnPrimary" href={`/organizations/${organizationId}`}>
          Manage Licenses
        </Link>
        <Link className="btnSoft" href={`/organizations/${organizationId}#distribute`}>
          Invite Members
        </Link>
        <a className="btnSoft" href={`/api/bulk-licensing/organizations/${organizationId}/export`}>
          Download License List
        </a>
      </div>

      {!ready && attempts >= 20 ? (
        <p className="mutedText">
          Still processing. Open Manage Licenses — seats appear as soon as the Stripe webhook
          finishes.
        </p>
      ) : null}
    </main>
  );
}

export default function BulkLicensesSuccessPage() {
  return (
    <Suspense fallback={<main className="bulkLicensingPage"><p>Loading…</p></main>}>
      <BulkSuccessInner />
    </Suspense>
  );
}
