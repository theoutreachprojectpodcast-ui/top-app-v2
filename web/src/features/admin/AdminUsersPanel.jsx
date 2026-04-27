"use client";

import { useCallback, useEffect, useState } from "react";

const ROLE_OPTIONS = ["user", "support", "member", "sponsor", "moderator", "admin"];

export default function AdminUsersPanel() {
  const [qInput, setQInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (qInput.trim()) params.set("q", qInput.trim());
      params.set("limit", "60");
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load users.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setError("Could not load users.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [qInput]);

  useEffect(() => {
    void load();
  }, []);

  async function patchUser(workosUserId, patch) {
    setSaving(workosUserId);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(workosUserId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Users</h2>
      <p className="adminMuted">Search by email or name. Role and status changes persist to `torp_profiles`.</p>
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="admin-q">
          Search
        </label>
        <input
          id="admin-q"
          className="adminConsoleInput"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="email or name"
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Search
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {(!loading && rows.length === 0) ? <p className="adminMuted">No users.</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Membership</th>
              <th>Onboarding</th>
              <th>Stripe</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Email">{r.email || "—"}</td>
                <td data-label="Name">
                  {(r.first_name || "") + " " + (r.last_name || "")}
                  <div className="adminMuted" style={{ fontSize: "0.75rem" }}>
                    {r.workos_user_id}
                  </div>
                </td>
                <td data-label="Role">
                  <select
                    className="adminConsoleInput"
                    value={String(r.platform_role || "user")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => patchUser(r.workos_user_id, { platform_role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Membership">
                  {r.membership_tier} / {r.membership_status}
                </td>
                <td data-label="Onboarding">{r.onboarding_status}</td>
                <td data-label="Stripe">{r.stripe_customer_id ? "yes" : "—"}</td>
                <td data-label="Actions" className="adminActionCell">
                  <select
                    className="adminConsoleInput"
                    value={String(r.membership_status || "none")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => patchUser(r.workos_user_id, { membership_status: e.target.value })}
                  >
                    {["none", "pending", "active", "past_due", "canceled", "incomplete"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
