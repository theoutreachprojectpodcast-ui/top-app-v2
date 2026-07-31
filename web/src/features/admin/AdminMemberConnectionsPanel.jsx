"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminMemberConnectionsPanel() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, accepted: 0, blocked: 0, other: 0 });
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "150");
      const res = await fetch(`/api/admin/community/connections?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || "Could not load member connections.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(json.connections) ? json.connections : []);
      setCounts(json.counts || { pending: 0, accepted: 0, blocked: 0, other: 0 });
    } catch {
      setError("Network error loading connections.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function adminMutate(row, action) {
    const actingAsProfileId =
      action === "cancel" ? row.requesterProfileId : row.requesterProfileId || row.recipientProfileId;
    if (!actingAsProfileId) {
      setMessage("Missing profile id for admin action.");
      return;
    }
    if (!window.confirm(`${action === "remove" ? "Remove" : "Cancel"} this connection record?`)) return;
    setBusyId(row.id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/community/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          connectionId: row.id,
          actingAsProfileId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMessage(json.error || "Action failed.");
      } else {
        setMessage(json.message || "Updated.");
        await load();
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="adminBlock" aria-label="Member connections">
      <h2 className="adminBlockTitle">Member connections</h2>
      <p className="adminMuted">
        Review pending requests, accepted friendships, and blocks. Admin actions are audited and do not impersonate
        accept/decline on a member’s behalf.
      </p>

      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className="communityRequestPill">Pending {counts.pending}</span>
        <span className="communityRequestPill communityRequestPill--friends">Accepted {counts.accepted}</span>
        <span className="communityRequestPill">Blocked {counts.blocked}</span>
      </div>

      <div className="row wrap" style={{ gap: 10, marginBottom: 14 }}>
        <label className="fieldLabel" style={{ display: "grid", gap: 4 }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All active</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label className="fieldLabel" style={{ display: "grid", gap: 4, flex: 1, minWidth: 180 }}>
          Search profile id
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Profile UUID" />
        </label>
        <button type="button" className="btnSoft" onClick={() => void load()} style={{ alignSelf: "end" }}>
          Refresh
        </button>
      </div>

      {error ? <p className="applyError">{error}</p> : null}
      {message ? <p className="applyStatus">{message}</p> : null}
      {loading ? <p className="adminMuted">Loading connections…</p> : null}

      {!loading && !rows.length ? <p className="adminMuted">No connection records match.</p> : null}

      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Status</th>
              <th>Requester</th>
              <th>Recipient</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.status}</td>
                <td>
                  <div>{row.requester?.name || row.requesterProfileId}</div>
                  <div className="adminMuted">{row.requester?.email || ""}</div>
                </td>
                <td>
                  <div>{row.recipient?.name || row.recipientProfileId}</div>
                  <div className="adminMuted">{row.recipient?.email || ""}</div>
                </td>
                <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</td>
                <td>
                  <div className="row wrap">
                    {row.status === "pending" ? (
                      <button
                        type="button"
                        className="btnSoft"
                        disabled={busyId === row.id}
                        onClick={() => void adminMutate(row, "cancel")}
                      >
                        Cancel request
                      </button>
                    ) : null}
                    {row.status === "accepted" || row.status === "blocked" || row.status === "pending" ? (
                      <button
                        type="button"
                        className="btnSoft"
                        disabled={busyId === row.id}
                        onClick={() => void adminMutate(row, "remove")}
                      >
                        {row.status === "pending" ? "Force clear" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
