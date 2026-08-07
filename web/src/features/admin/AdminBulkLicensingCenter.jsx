"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminSectionCard from "@/components/admin/AdminSectionCard";

export default function AdminBulkLicensingCenter() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [techOpen, setTechOpen] = useState(false);
  const [findings, setFindings] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagOpen, setDiagOpen] = useState(false);

  const loadList = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/admin/bulk-licensing?q=${encodeURIComponent(q)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to load organizations.");
      return;
    }
    setRows(data.organizations || []);
  }, [q]);

  const loadDiagnostics = useCallback(async () => {
    const res = await fetch("/api/admin/bulk-licensing/diagnostics", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (res.ok) setDiagnostics(data);
  }, []);

  useEffect(() => {
    loadList();
    loadDiagnostics();
  }, [loadList, loadDiagnostics]);

  async function loadDetail(id) {
    setSelectedId(id);
    setDetail(null);
    setFindings(null);
    const res = await fetch(`/api/admin/bulk-licensing/${id}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to load detail.");
      return;
    }
    setDetail(data);
    setNotes(data.organization?.internal_notes || "");
  }

  async function saveNotes() {
    await fetch(`/api/admin/bulk-licensing/${selectedId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_notes", notes }),
    });
  }

  async function reconcile(apply) {
    const res = await fetch("/api/admin/bulk-licensing/reconcile", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: selectedId, apply }),
    });
    const data = await res.json().catch(() => ({}));
    setFindings(data.findings || []);
    if (apply) await loadDetail(selectedId);
  }

  async function revoke(licenseId) {
    if (!window.confirm("Revoke this license?")) return;
    await fetch(`/api/admin/bulk-licensing/${selectedId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke_license", licenseId, reason: "admin_support" }),
    });
    await loadDetail(selectedId);
  }

  const org = detail?.organization;
  const sub = detail?.subscriptions?.[0];

  return (
    <AdminPanelShell title="Bulk licensing" description="Organization packages, seats, and Stripe support tools.">
      {error ? <p className="formError">{error}</p> : null}

      <AdminSectionCard title="Bulk License Testing" description="Navigation shortcuts only — purchases still use the real Stripe checkout flow.">
        <div className="orgLicenseDashboard__actions">
          <Link className="btnPrimary" href="/bulk-licenses">
            Bulk License Store
          </Link>
          <Link className="btnSoft" href="/bulk-licenses?package=25">
            25-seat checkout
          </Link>
          <Link className="btnSoft" href="/bulk-licenses?package=50">
            50-seat checkout
          </Link>
          <Link className="btnSoft" href="/bulk-licenses?package=100">
            100-seat checkout
          </Link>
          <Link className="btnSoft" href="/bulk-licenses?package=200">
            200-seat checkout
          </Link>
          <Link className="btnSoft" href="/redeem">
            Redeem
          </Link>
        </div>
        {diagnostics?.recentOrganizations?.[0] ? (
          <p className="mutedText" style={{ marginTop: 12 }}>
            Latest purchase:{" "}
            <button
              type="button"
              className="btnSoft"
              onClick={() => loadDetail(diagnostics.recentOrganizations[0].id)}
            >
              {diagnostics.recentOrganizations[0].name} ({diagnostics.recentOrganizations[0].business_code})
            </button>
            {" · "}
            <Link href={`/organizations/${diagnostics.recentOrganizations[0].id}`}>Open dashboard</Link>
          </p>
        ) : null}
        <button type="button" className="btnSoft" onClick={() => setDiagOpen((v) => !v)} style={{ marginTop: 8 }}>
          {diagOpen ? "Hide" : "Show"} environment diagnostics
        </button>
        {diagOpen && diagnostics ? (
          <div style={{ marginTop: 12 }}>
            <p>
              Environment <strong>{diagnostics.environment}</strong> · Stripe mode{" "}
              <strong>{diagnostics.stripeMode}</strong>
            </p>
            <p>
              Checkout configured: {diagnostics.checkoutConfigured ? "yes" : "no"} · Webhook configured:{" "}
              {diagnostics.webhookConfigured ? "yes" : "no"}
            </p>
            <ul>
              {(diagnostics.packages || []).map((p) => (
                <li key={p.size}>
                  {p.size} seats → {p.priceId || "(not set)"}
                  {p.displayPrice ? ` · ${p.displayPrice}` : ""}
                  {p.interval ? ` · ${p.interval}` : ""}
                </li>
              ))}
            </ul>
            {diagnostics.missingEnvKeys?.length ? (
              <p className="formError">Missing: {diagnostics.missingEnvKeys.join(", ")}</p>
            ) : null}
            <h4>Recent webhooks</h4>
            <ul>
              {(diagnostics.recentWebhooks || []).slice(0, 5).map((w) => (
                <li key={w.stripe_event_id}>
                  {w.event_type} · {w.processing_status} · {w.stripe_event_id}
                </li>
              ))}
              {!diagnostics.recentWebhooks?.length ? <li>None yet</li> : null}
            </ul>
            <h4>Recent batches</h4>
            <ul>
              {(diagnostics.recentBatches || []).map((b) => (
                <li key={b.id}>
                  {b.package_size} seats · generated {b.generated_count} · {b.status}
                </li>
              ))}
              {!diagnostics.recentBatches?.length ? <li>None yet</li> : null}
            </ul>
          </div>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard title="Organizations">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            className="textInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, code, email"
          />
          <button type="button" className="btnSoft" onClick={loadList}>
            Search
          </button>
        </div>
        <table className="orgLicenseDashboard__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Status</th>
              <th>Package</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.business_code}</td>
                <td>{row.status}</td>
                <td>{row.subscription?.package_size || "—"}</td>
                <td>
                  <button type="button" className="btnSoft" onClick={() => loadDetail(row.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSectionCard>

      {org ? (
        <AdminSectionCard title={org.name}>
          <p>
            Code <strong>{org.business_code}</strong> · Status <strong>{org.status}</strong> · Package{" "}
            {sub?.package_size || "—"} · Sub {sub?.subscription_status || "—"}
          </p>
          <p className="mutedText">
            Purchaser {org.purchaser_name} ({org.purchaser_email}) · Billing {org.billing_email}
          </p>
          <label className="fieldLabel" htmlFor="notes">
            Internal notes
          </label>
          <textarea
            id="notes"
            className="textInput"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="button" className="btnSoft" onClick={saveNotes}>
            Save notes
          </button>
          <button type="button" className="btnSoft" onClick={() => reconcile(false)}>
            Reconcile (report only)
          </button>
          <button type="button" className="btnSoft" onClick={() => reconcile(true)}>
            Reconcile & sync status from Stripe
          </button>
          {findings ? (
            <ul>
              {findings.map((f, i) => (
                <li key={`${f.code}-${i}`}>
                  [{f.severity}] {f.code} {f.detail || ""}
                </li>
              ))}
              {!findings.length ? <li>No findings</li> : null}
            </ul>
          ) : null}

          <h3>Licenses</h3>
          <table className="orgLicenseDashboard__table">
            <thead>
              <tr>
                <th>Seat</th>
                <th>Code</th>
                <th>Status</th>
                <th>Email</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(detail.licenses || []).slice(0, 100).map((lic) => (
                <tr key={lic.id}>
                  <td>{lic.seat_number}</td>
                  <td>
                    <code>{lic.display_code_masked}</code>
                  </td>
                  <td>{lic.status}</td>
                  <td>{lic.assigned_email || "—"}</td>
                  <td>
                    {lic.status !== "revoked" ? (
                      <button type="button" className="btnSoft" onClick={() => revoke(lic.id)}>
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Admins</h3>
          <ul>
            {(detail.members || []).map((m) => (
              <li key={m.id}>
                {m.email || m.workos_user_id} · {m.role} · {m.status}
              </li>
            ))}
          </ul>

          <button type="button" className="btnSoft" onClick={() => setTechOpen((v) => !v)}>
            {techOpen ? "Hide" : "Show"} technical details
          </button>
          {techOpen ? (
            <div>
              <p>
                Org id <code>{org.id}</code>
              </p>
              <p>
                Stripe customer <code>{sub?.stripe_customer_id || "—"}</code>
              </p>
              <p>
                Stripe subscription <code>{sub?.stripe_subscription_id || "—"}</code>
                {sub?.stripe_subscription_id ? (
                  <>
                    {" "}
                    <Link
                      href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`}
                      target="_blank"
                    >
                      Open in Stripe
                    </Link>
                  </>
                ) : null}
              </p>
              <h4>Webhook events</h4>
              <ul>
                {(detail.webhooks || []).map((w) => (
                  <li key={w.stripe_event_id}>
                    {w.event_type} · {w.processing_status} · {w.stripe_event_id}
                    {w.error_summary ? ` · ${w.error_summary}` : ""}
                  </li>
                ))}
              </ul>
              <h4>Audit</h4>
              <ul>
                {(detail.events || []).slice(0, 30).map((ev) => (
                  <li key={ev.id}>
                    {ev.event_type} · {new Date(ev.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </AdminSectionCard>
      ) : null}
    </AdminPanelShell>
  );
}
