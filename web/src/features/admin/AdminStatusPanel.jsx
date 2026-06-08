"use client";

import AdminPanelShell from "@/components/admin/AdminPanelShell";
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
        setError(
          body.message || body.error || (res.status === 503 ? "Server storage is not configured." : "") || "Could not load status.",
        );
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
    <AdminPanelShell panelId="status" error={error}>
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
    </AdminPanelShell>
  );
}
