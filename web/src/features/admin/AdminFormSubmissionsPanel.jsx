"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminFormSubmissionsPanel() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await fetch(`/api/admin/form-submissions${q}`, { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load submissions.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(body.rows) ? body.rows : []);
    } catch {
      setError("Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id, nextStatus) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/form-submissions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Update failed.");
        return;
      }
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Form submissions
      </h1>
      <p className="adminMuted">General intake stored in `form_submissions`. Contact-specific routing is under Operations → Contact.</p>
      <div className="adminToolbar">
        <select className="adminConsoleInput" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="archived">Archived</option>
        </select>
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Form</th>
              <th>Status</th>
              <th>Created</th>
              <th>Payload</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.form_key || row.form_type || "—"}</td>
                <td>{row.status || "—"}</td>
                <td>{String(row.created_at || "").slice(0, 19).replace("T", " ")}</td>
                <td>
                  <pre style={{ fontSize: 11, maxWidth: 320, overflow: "auto", margin: 0 }}>
                    {JSON.stringify(row.payload || row.data || row, null, 0).slice(0, 400)}
                  </pre>
                </td>
                <td>
                  <select
                    className="adminConsoleInput"
                    disabled={busy === row.id}
                    value={row.status || "new"}
                    onChange={(e) => void updateStatus(row.id, e.target.value)}
                  >
                    <option value="new">new</option>
                    <option value="reviewed">reviewed</option>
                    <option value="archived">archived</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 ? <p className="adminMuted">No submissions.</p> : null}
    </div>
  );
}
