"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminApplicationsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/sponsor-applications", { credentials: "include" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Could not load applications.");
      setRows([]);
    } else {
      setRows(Array.isArray(body.records) ? body.records : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateApplication(id, patch) {
    const res = await fetch("/api/admin/sponsor-applications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Sponsorship applications</h2>
      <p className="adminMuted">Review sponsor applications and convert approved records to live sponsors.</p>
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Company</th><th>Type</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Company">{row.company_name || "—"}</td>
                <td data-label="Type">{row.sponsor_type_requested || "—"}</td>
                <td data-label="Status">
                  <select
                    className="adminConsoleInput"
                    value={row.application_status || "submitted"}
                    onChange={(e) => updateApplication(row.id, { application_status: e.target.value, internal_notes: row.internal_notes || "" })}
                  >
                    {["submitted", "reviewing", "approved", "rejected", "invoice_sent", "paid", "onboarded", "active", "archived"].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td data-label="Payment">{row.payment_status || "submitted"}</td>
                <td data-label="Actions" className="adminActionCell">
                  <button type="button" className="btnSoft" onClick={() => updateApplication(row.id, { application_status: "invoice_sent", internal_notes: row.internal_notes || "" })}>
                    Mark invoice sent
                  </button>
                  <button
                    type="button"
                    className="btnPrimary"
                    onClick={() => updateApplication(row.id, { action: "convert_to_sponsor", application_status: "active", sponsor_scope: "app", internal_notes: row.internal_notes || "" })}
                  >
                    Convert to sponsor
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
