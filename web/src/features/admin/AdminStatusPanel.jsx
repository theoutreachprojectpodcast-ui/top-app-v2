"use client";

import AdminPanelShell from "@/components/admin/AdminPanelShell";
import { useCallback, useEffect, useState } from "react";

export default function AdminStatusPanel() {
  const [stats, setStats] = useState({});
  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statusRes, buildRes] = await Promise.all([
        fetch("/api/admin/status", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/build", { credentials: "include", cache: "no-store" }),
      ]);
      const statusBody = await statusRes.json().catch(() => ({}));
      const buildBody = await buildRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        setError(
          statusBody.message ||
            statusBody.error ||
            (statusRes.status === 503 ? "Server storage is not configured." : "") ||
            "Could not load status.",
        );
        setStats({});
      } else {
        setStats(statusBody.stats || {});
      }
      if (buildRes.ok && buildBody.build) {
        setBuild(buildBody.build);
      } else {
        setBuild(null);
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
      {!loading && build ? (
        <section className="adminSection" aria-labelledby="admin-build-identity-title">
          <h3 id="admin-build-identity-title" className="adminSectionTitle">
            Production build identity
          </h3>
          <p className="adminMuted">
            Use this to confirm every browser and device is on the same Vercel release. No secrets are
            shown.
          </p>
          <div className="adminTableWrap">
            <table className="adminTable">
              <tbody>
                <tr>
                  <td data-label="Field">App version</td>
                  <td data-label="Value">{build.appVersion || "—"}</td>
                </tr>
                <tr>
                  <td data-label="Field">Environment</td>
                  <td data-label="Value">{build.environment || "—"}</td>
                </tr>
                <tr>
                  <td data-label="Field">Commit</td>
                  <td data-label="Value">
                    <code>{build.commitSha || "—"}</code>
                    {build.commitShort ? ` (${build.commitShort})` : ""}
                  </td>
                </tr>
                <tr>
                  <td data-label="Field">Deployment ID</td>
                  <td data-label="Value">
                    <code>{build.deploymentId || "—"}</code>
                  </td>
                </tr>
                <tr>
                  <td data-label="Field">Build time</td>
                  <td data-label="Value">{build.buildTimestamp || "—"}</td>
                </tr>
                <tr>
                  <td data-label="Field">Region</td>
                  <td data-label="Value">{build.region || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {!loading ? (
        <div className="adminTableWrap">
          <table className="adminTable">
            <tbody>
              {Object.entries(stats).map(([key, value]) => (
                <tr key={key}>
                  <td data-label="Metric" className="adminTable__cell--capitalize">
                    {key}
                  </td>
                  <td data-label="Value">{String(value ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="adminActions">
        <button type="button" className="btnSoft" onClick={() => void load()}>
          Refresh status
        </button>
      </div>
    </AdminPanelShell>
  );
}
