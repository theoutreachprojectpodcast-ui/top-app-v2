"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_FORM = {
  recipientEmail: "",
  ccEmail: "",
  bccEmail: "",
  successMessage: "Thanks for reaching out. We will get back to you shortly.",
};

export default function AdminContactPanel() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, submissionsRes] = await Promise.all([
        fetch("/api/admin/contact-settings", { credentials: "include" }),
        fetch(`/api/admin/form-submissions${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`, {
          credentials: "include",
        }),
      ]);
      const settingsBody = await settingsRes.json().catch(() => ({}));
      const submissionsBody = await submissionsRes.json().catch(() => ({}));
      if (!settingsRes.ok) throw new Error(settingsBody.error || "Failed to load contact settings");
      if (!submissionsRes.ok) throw new Error(submissionsBody.error || "Failed to load submissions");
      setForm({ ...DEFAULT_FORM, ...(settingsBody.settings || {}) });
      setRows(Array.isArray(submissionsBody.rows) ? submissionsBody.rows : []);
    } catch (loadError) {
      setError(loadError?.message || "Could not load contact admin data.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/contact-settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Save failed.");
      return;
    }
    setMessage("Contact routing settings saved.");
  }

  async function setSubmissionStatus(id, status) {
    const res = await fetch("/api/admin/form-submissions", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Contact settings and submissions</h2>
      <p className="adminMuted">Set recipient routing and review stored contact submissions.</p>
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--color-success, #166534)" }}>{message}</p> : null}

      <div className="adminFieldStack">
        {[
          ["recipientEmail", "Primary recipient email"],
          ["ccEmail", "CC email"],
          ["bccEmail", "BCC email"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="fieldLabel" htmlFor={`contact-${key}`}>{label}</label>
            <input
              id={`contact-${key}`}
              className="adminConsoleInput"
              value={form[key] || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className="fieldLabel" htmlFor="contact-success">Success message</label>
          <textarea
            id="contact-success"
            className="adminConsoleInput"
            value={form.successMessage || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, successMessage: e.target.value }))}
          />
        </div>
        <button type="button" className="btnPrimary" onClick={() => void saveSettings()}>Save contact settings</button>
      </div>

      <hr className="adminRule" style={{ margin: "16px 0" }} />
      <div className="adminToolbar">
        <select className="adminConsoleInput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">new</option>
          <option value="reviewing">reviewing</option>
          <option value="resolved">resolved</option>
          <option value="archived">archived</option>
        </select>
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>Refresh submissions</button>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Subject</th><th>Status</th><th>Message</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Name">{row.full_name || "—"}</td>
                <td data-label="Email">{row.email || "—"}</td>
                <td data-label="Subject">{row.subject || "—"}</td>
                <td data-label="Status">
                  <select className="adminConsoleInput" value={row.status || "new"} onChange={(e) => setSubmissionStatus(row.id, e.target.value)}>
                    {["new", "reviewing", "resolved", "archived"].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </td>
                <td data-label="Message">{row.message || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
