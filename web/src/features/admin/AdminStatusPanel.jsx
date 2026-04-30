"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminStatusPanel() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/status", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load status.");
        setStats({});
      } else {
        setStats(body.stats || {});
      }
    } catch {
      setError("Could not load status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>QA / admin status panel</h2>
      <p className="adminMuted">Live high-level counters from admin-managed tables.</p>
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading ? (
        <div className="adminTableWrap">
          <table className="adminTable">
            <tbody>
              {Object.entries(stats).map(([key, value]) => (
                <tr key={key}>
                  <td data-label="Metric" style={{ textTransform: "capitalize" }}>{key}</td>
                  <td data-label="Value">{String(value ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <button type="button" className="btnSoft" onClick={() => void load()} style={{ marginTop: 12 }}>
        Refresh status
      </button>
    </div>
  );
}
