"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

function StatCard({ label, value, href }) {
  const inner = (
    <>
      <span className="adminMuted">{label}</span>
      <span className="adminDashboardStat">{value ?? "—"}</span>
    </>
  );
  return href ? (
    <Link className="adminDashboardCard" href={href}>
      {inner}
    </Link>
  ) : (
    <div className="adminDashboardCard">{inner}</div>
  );
}

export default function AdminAnalyticsPlatform() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load analytics.");
        return;
      }
      setMetrics(body);
    } catch {
      setError("Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const u = metrics?.users || {};
  const c = metrics?.community || {};
  const sp = metrics?.sponsors || {};
  const p = metrics?.podcast || {};
  const m = metrics?.membership || {};

  return (
    <AdminPanelShell panelId="analytics" error={error}>
      {loading ? <p className="adminMuted">Loading…</p> : null}

      {!loading && metrics ? (
        <>
          <h2 className="adminSectionTitle">Users</h2>
          <div className="adminDashboardGrid">
            <StatCard label="Total accounts" value={u.total} href="/admin/users" />
            <StatCard label="New (7d)" value={u.newWeek} href="/admin/users" />
            <StatCard label="New (30d)" value={u.newMonth} href="/admin/users" />
            <StatCard label="Suspended" value={u.suspended} href="/admin/users" />
          </div>

          <h2 className="adminSectionTitle">Community</h2>
          <div className="adminDashboardGrid">
            <StatCard label="Approved posts" value={c.approved} href="/admin/community" />
            <StatCard label="Rejected" value={c.rejected} href="/admin/community" />
            <StatCard label="Pending review" value={c.pending} href="/admin/community" />
          </div>

          <h2 className="adminSectionTitle">Sponsors & resources</h2>
          <div className="adminDashboardGrid">
            <StatCard label="Active sponsors" value={sp.active} href="/admin/sponsors" />
            <StatCard label="Featured sponsors" value={sp.featured} href="/admin/sponsors" />
            <StatCard label="Trusted resources" value={metrics.resources?.active} href="/admin/trusted" />
          </div>

          <h2 className="adminSectionTitle">Podcast & membership</h2>
          <div className="adminDashboardGrid">
            <StatCard label="Applications" value={p.applications} href="/admin/podcasts" />
            <StatCard label="Approved applications" value={p.approved} href="/admin/podcasts" />
            <StatCard label="Active memberships" value={m.active} href="/admin/membership" />
            <StatCard label="Canceled" value={m.canceled} href="/admin/membership" />
          </div>

          {metrics.note ? <p className="adminMuted adminDisclaimer">{metrics.note}</p> : null}
        </>
      ) : null}

      <div className="adminActions">
        <button type="button" className="btnSoft" onClick={() => void load()}>
          Refresh
        </button>
      </div>
    </AdminPanelShell>
  );
}
