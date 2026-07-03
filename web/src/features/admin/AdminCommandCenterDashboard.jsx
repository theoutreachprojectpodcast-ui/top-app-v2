"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

const ACTIONS = [
  { href: "/admin/content/create", label: "Create content", desc: "Guided wizard" },
  { href: "/admin/community", label: "Moderation queue", desc: "Pending community posts" },
  { href: "/admin/podcasts", label: "Podcast applications", desc: "Review guest intake" },
  { href: "/admin/users", label: "Users", desc: "Search and manage accounts" },
  { href: "/admin/sponsors", label: "Sponsors", desc: "Catalog and featured flags" },
  { href: "/admin/billing", label: "Billing ops", desc: "Revenue and forecasts" },
];

export default function AdminCommandCenterDashboard() {
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [centerRes, feedRes] = await Promise.all([
        fetch("/api/admin/command-center", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/activity-feed?limit=30", { credentials: "include", cache: "no-store" }),
      ]);
      const body = await centerRes.json().catch(() => ({}));
      const feedBody = await feedRes.json().catch(() => ({}));
      if (!centerRes.ok) {
        setError(body.error || "Could not load command center.");
        return;
      }
      setData(body);
      setActivities(Array.isArray(feedBody.activities) ? feedBody.activities : []);
    } catch {
      setError("Could not load command center.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = data?.queues || {};
  const s = data?.snapshots || {};

  return (
    <AdminPanelShell panelId="dashboard" error={error}>
      {loading ? <p className="adminMuted">Loading…</p> : null}

      <h2 className="adminSectionTitle">Quick actions</h2>
      <div className="adminDashboardGrid">
        {ACTIONS.map((a) => (
          <Link key={a.href} className="adminDashboardCard" href={a.href}>
            <strong>{a.label}</strong>
            <span className="adminMuted">{a.desc}</span>
          </Link>
        ))}
      </div>

      {!loading && data ? (
        <>
          <h2 className="adminSectionTitle">Moderation & intake</h2>
          <div className="adminDashboardGrid">
            <Link className="adminDashboardCard" href="/admin/community">
              <span className="adminMuted">Community pending</span>
              <span className="adminDashboardStat">{q.communityPending ?? 0}</span>
            </Link>
            <Link className="adminDashboardCard" href="/admin/community">
              <span className="adminMuted">Draft posts</span>
              <span className="adminDashboardStat">{q.communityDrafts ?? 0}</span>
            </Link>
            <Link className="adminDashboardCard" href="/admin/podcasts">
              <span className="adminMuted">Podcast applications</span>
              <span className="adminDashboardStat">{q.podcastApplications ?? 0}</span>
            </Link>
            <Link className="adminDashboardCard" href="/admin/applications">
              <span className="adminMuted">New sponsor applications</span>
              <span className="adminDashboardStat">{q.sponsorAppsNew ?? 0}</span>
            </Link>
          </div>

          <h2 className="adminSectionTitle">Platform snapshots</h2>
          <div className="adminDashboardGrid">
            <Link className="adminDashboardCard" href="/admin/users">
              <span className="adminMuted">Total users</span>
              <span className="adminDashboardStat">{s.usersTotal ?? 0}</span>
              <span className="adminMuted">+{s.usersNewWeek ?? 0} this week</span>
            </Link>
            <Link className="adminDashboardCard" href="/admin/billing">
              <span className="adminMuted">Est. MRR (tiers)</span>
              <span className="adminDashboardStat">${s.estimatedMrrUsd ?? 0}</span>
            </Link>
            <Link className="adminDashboardCard" href="/admin/sponsors">
              <span className="adminMuted">Active sponsors</span>
              <span className="adminDashboardStat">{s.sponsorsActive ?? 0}</span>
            </Link>
            <Link className="adminDashboardCard" href="/admin/trusted">
              <span className="adminMuted">Trusted resources</span>
              <span className="adminDashboardStat">{s.trustedActive ?? 0}</span>
            </Link>
          </div>

          <h2 className="adminSectionTitle">Recent admin activity</h2>
          {activities.length ? (
            <ul className="adminActivityFeed">
              {activities.map((a) => (
                <li key={a.id}>
                  <span className="adminActivityFeed__when">
                    {String(a.createdAt || "").slice(0, 16).replace("T", " ")}
                  </span>
                  <strong>{a.summary}</strong>
                  <span className="adminMuted">
                    {a.actorEmail ? ` · ${a.actorEmail}` : ""}
                    {a.resourceId ? ` · ${String(a.resourceId).slice(0, 8)}…` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adminMuted">No audit log entries yet. Actions across sponsors, community, billing, and content will appear here.</p>
          )}

          <h2 className="adminSectionTitle">System health</h2>
          <ul className="adminMuted adminProse">
            <li>
              Stripe secret: {data.stripe?.secretConfigured ? "configured" : "missing"}
            </li>
            <li>
              Member recurring checkout: {data.stripe?.memberRecurring ? "yes" : "no"}
            </li>
            <li>Webhook: {data.stripe?.webhook ? "configured" : "missing"}</li>
          </ul>

          {data.recentBilling?.length ? (
            <>
              <h2 className="adminSectionTitle">Recent invoice records</h2>
              <div className="adminTableWrap">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBilling.map((r) => (
                      <tr key={r.id}>
                        <td>${r.amountUsd}</td>
                        <td>{r.status}</td>
                        <td>{String(r.createdAt || "").slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <p className="adminMuted adminDisclaimer">{data.disclaimer}</p>
        </>
      ) : null}

      <div className="adminActions">
        <button type="button" className="btnSoft" onClick={() => void load()}>
          Refresh
        </button>
        <Link className="btnSoft" href="/admin/analytics">
          Full analytics
        </Link>
      </div>
    </AdminPanelShell>
  );
}
