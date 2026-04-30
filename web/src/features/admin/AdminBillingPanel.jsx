"use client";

import { useCallback, useEffect, useState } from "react";

const BLANK = {
  workosUserId: "",
  recipientEmail: "",
  recipientName: "",
  amount: "",
  reason: "",
  paymentUrl: "",
  notes: "",
};

export default function AdminBillingPanel() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/billing", { credentials: "include" });
    const body = await res.json().catch(() => ({}));
    setRows(Array.isArray(body.rows) ? body.rows : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvoice() {
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/billing", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.message || body.error || "Invoice send failed.");
      return;
    }
    setMessage("Invoice email sent and billing record stored.");
    setForm(BLANK);
    void load();
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Invoice email tools</h2>
      <p className="adminMuted">Send invoice emails and track billing action records.</p>
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--color-success, #166534)" }}>{message}</p> : null}
      <div className="adminFieldStack">
        {[
          ["workosUserId", "WorkOS user id"],
          ["recipientName", "Recipient name"],
          ["recipientEmail", "Recipient email"],
          ["amount", "Amount (USD)"],
          ["reason", "Invoice reason"],
          ["paymentUrl", "Payment link / invoice URL"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="fieldLabel" htmlFor={`bill-${key}`}>{label}</label>
            <input id={`bill-${key}`} className="adminConsoleInput" value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} />
          </div>
        ))}
        <div>
          <label className="fieldLabel" htmlFor="bill-notes">Optional notes</label>
          <textarea id="bill-notes" className="adminConsoleInput" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>
        <button type="button" className="btnPrimary" onClick={() => void sendInvoice()}>Send invoice email</button>
      </div>

      <hr className="adminRule" style={{ margin: "16px 0" }} />
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Recipient</th><th>Amount</th><th>Reason</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Recipient">{row.recipient_name || row.recipient_email}</td>
                <td data-label="Amount">${((row.amount_cents || 0) / 100).toFixed(2)}</td>
                <td data-label="Reason">{row.reason || "—"}</td>
                <td data-label="Status">{row.status || "—"}</td>
                <td data-label="Created">{String(row.created_at || "").slice(0, 19).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
