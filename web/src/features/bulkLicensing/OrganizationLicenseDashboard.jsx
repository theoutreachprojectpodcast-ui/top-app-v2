"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export default function OrganizationLicenseDashboard({ orgId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [emailText, setEmailText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bulk-licensing/organizations/${orgId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || "Could not load organization.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Network error loading organization.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const rows = data?.licenses || [];
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        String(row.seatNumber).includes(q) ||
        String(row.displayCode || "").toLowerCase().includes(q) ||
        String(row.assignedEmail || "").toLowerCase().includes(q) ||
        String(row.status || "").toLowerCase().includes(q)
      );
    });
  }, [data, statusFilter, query]);

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch(`/api/bulk-licensing/portal?organizationId=${orgId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: `/organizations/${orgId}` }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || "Could not open billing portal.");
        return;
      }
      if (json.url) window.location.href = json.url;
    } finally {
      setBusy("");
    }
  }

  async function assignEmails() {
    const emails = emailText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (!emails.length) return;
    setBusy("assign");
    setError("");
    try {
      const res = await fetch(`/api/bulk-licensing/organizations/${orgId}/licenses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || "Assignment failed.");
        return;
      }
      setEmailText("");
      await load();
    } finally {
      setBusy("");
    }
  }

  async function onCsvUpload(file) {
    if (!file) return;
    setBusy("csv");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/bulk-licensing/organizations/${orgId}/licenses`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || "CSV assignment failed.");
        return;
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  async function cancelAssignment(licenseId) {
    if (!window.confirm("Return this unredeemed seat to the available pool?")) return;
    setBusy(licenseId);
    try {
      const res = await fetch(`/api/bulk-licensing/organizations/${orgId}/licenses`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseId, action: "cancel_assignment" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || "Could not cancel assignment.");
        return;
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  async function revokeLicense(licenseId) {
    if (!window.confirm("Revoke this license? Redeemed members will lose organization access.")) return;
    setBusy(licenseId);
    try {
      const res = await fetch(`/api/bulk-licensing/organizations/${orgId}/licenses`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseId, action: "revoke" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || "Could not revoke license.");
        return;
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  if (loading) return <p>Loading organization licenses…</p>;
  if (error && !data) return <p className="formError">{error}</p>;
  if (!data) return null;

  const { organization, subscription, counts, recentActivity, membership } = data;
  const canLicenses =
    membership?.role === "owner" ||
    membership?.role === "license_admin" ||
    membership?.role === "billing_admin";
  const canBilling = membership?.role === "owner" || membership?.role === "billing_admin";

  return (
    <div className="orgLicenseDashboard">
      <header className="orgLicenseDashboard__header">
        <div>
          <h1>{organization.name}</h1>
          <p className="mutedText">
            Business code <strong>{organization.business_code}</strong> · Status{" "}
            <strong>{organization.status}</strong>
          </p>
        </div>
        {canBilling ? (
          <button type="button" className="btnSoft" onClick={openPortal} disabled={busy === "portal"}>
            Manage billing
          </button>
        ) : null}
      </header>

      {organization.status === "past_due" ? (
        <p className="formError">Billing is past due. Update payment to avoid seat suspension.</p>
      ) : null}
      {error ? <p className="formError">{error}</p> : null}

      <section className="orgLicenseDashboard__stats">
        <div>
          <strong>{counts.total}</strong>
          <span>Total seats</span>
        </div>
        <div>
          <strong>{counts.available}</strong>
          <span>Available</span>
        </div>
        <div>
          <strong>{counts.assigned}</strong>
          <span>Assigned</span>
        </div>
        <div>
          <strong>{counts.redeemed}</strong>
          <span>Redeemed</span>
        </div>
      </section>

      <p className="mutedText">
        Package {subscription?.package_size || "—"} · Subscription {subscription?.subscription_status || "—"}
        {subscription?.current_period_end
          ? ` · Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
          : ""}
        {subscription?.cancel_at_period_end ? " · Cancels at period end" : ""}
      </p>

      {canLicenses ? (
        <section id="distribute" className="orgLicenseDashboard__distribute">
          <h2>Distribute licenses</h2>
          <p className="mutedText">
            Assignment reserves a seat until redeemed. You can cancel an invitation to return it to the
            pool.
          </p>
          <label className="fieldLabel" htmlFor="emails">
            Assign by email (one per line)
          </label>
          <textarea
            id="emails"
            className="textInput"
            rows={4}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="member@company.com"
          />
          <div className="orgLicenseDashboard__actions">
            <button type="button" className="btnPrimary" onClick={assignEmails} disabled={busy === "assign"}>
              Assign & send invitations
            </button>
            <label className="btnSoft">
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => onCsvUpload(e.target.files?.[0])}
              />
            </label>
            <a className="btnSoft" href={`/api/bulk-licensing/organizations/${orgId}/export`}>
              Download CSV
            </a>
          </div>
        </section>
      ) : null}

      <section>
        <div className="orgLicenseDashboard__tableTools">
          <input
            className="textInput"
            placeholder="Search seats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="textInput"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="redeemed">Redeemed</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="orgLicenseDashboard__tableWrap">
          <table className="orgLicenseDashboard__table">
            <thead>
              <tr>
                <th>Seat</th>
                <th>Code</th>
                <th>Email</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Redeemed</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.seatNumber}</td>
                  <td>
                    <code>{row.displayCode}</code>
                    {row.fullCodeAvailable ? (
                      <button
                        type="button"
                        className="btnSoft"
                        onClick={() => navigator.clipboard?.writeText(row.displayCode)}
                      >
                        Copy
                      </button>
                    ) : null}
                  </td>
                  <td>{row.assignedEmail || "—"}</td>
                  <td>{row.status}</td>
                  <td>{row.assignedAt ? new Date(row.assignedAt).toLocaleDateString() : "—"}</td>
                  <td>{row.redeemedAt ? new Date(row.redeemedAt).toLocaleDateString() : "—"}</td>
                  <td>{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}</td>
                  <td>
                    {canLicenses && row.status === "assigned" ? (
                      <button type="button" className="btnSoft" onClick={() => cancelAssignment(row.id)}>
                        Cancel invite
                      </button>
                    ) : null}
                    {canLicenses && (row.status === "redeemed" || row.status === "assigned") ? (
                      <button type="button" className="btnSoft" onClick={() => revokeLicense(row.id)}>
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Recent activity</h2>
        <ul className="orgLicenseDashboard__activity">
          {(recentActivity || []).map((ev) => (
            <li key={ev.id}>
              <strong>{ev.event_type}</strong> · {new Date(ev.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
