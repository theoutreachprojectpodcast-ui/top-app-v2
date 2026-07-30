"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import AdminAdvancedSettings from "@/components/admin/AdminAdvancedSettings";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

const QUICK_CREATE = [
  { href: "/admin/content/create", label: "Create content", desc: "Guided draft wizard" },
  { href: "/admin/community", label: "Community post", desc: "Write or moderate posts" },
  { href: "/admin/sponsors", label: "Add sponsor", desc: "Catalog and branding" },
  { href: "/admin/podcasts", label: "Podcast tools", desc: "Episodes and guests" },
  { href: "/admin/nonprofits", label: "Nonprofit", desc: "Directory enrichment" },
  { href: "/admin/users", label: "Review members", desc: "Accounts and roles" },
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
  const needsAttention = [
    { href: "/admin/community", label: "Community pending", count: q.communityPending ?? 0 },
    { href: "/admin/community", label: "Draft posts", count: q.communityDrafts ?? 0 },
    { href: "/admin/podcasts", label: "Podcast applications", count: q.podcastApplications ?? 0 },
    { href: "/admin/applications", label: "Sponsor applications", count: q.sponsorAppsNew ?? 0 },
  ].filter((item) => Number(item.count) > 0);

  return (
    <AdminPanelShell
      panelId="dashboard"
      title="Overview"
      description="See what needs attention, jump into common edits, and scan recent platform activity."
      status={needsAttention.length ? "attention" : "live"}
      statusLabel={needsAttention.length ? "Needs attention" : "All clear"}
      error={error}
      primaryAction={
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      }
      secondaryActions={
        <Link className="btnSoft" href="/admin/analytics">
          View reports
        </Link>
      }
    >
      {loading && !data ? <p className="adminMuted">Loading overview…</p> : null}

      <AdminSectionCard
        title="Needs attention"
        description="Queues that usually require an admin decision today."
      >
        {needsAttention.length ? (
          <div className="adminAttentionList">
            {needsAttention.map((item) => (
              <Link key={`${item.href}-${item.label}`} className="adminTaskCard" href={item.href}>
                <strong>{item.label}</strong>
                <span className="adminDashboardStat">{item.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Nothing waiting"
            description="No pending community posts, podcast applications, or new sponsor applications."
          />
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Quick create" description="Start the most common content and member tasks.">
        <div className="adminTaskGrid">
          {QUICK_CREATE.map((a) => (
            <Link key={a.href} className="adminTaskCard" href={a.href}>
              <strong>{a.label}</strong>
              <span className="adminMuted">{a.desc}</span>
            </Link>
          ))}
        </div>
      </AdminSectionCard>

      {!loading && data ? (
        <>
          <AdminSectionCard title="At a glance" description="High-level platform counts — open a card to manage that area.">
            <div className="adminDashboardGrid">
              <Link className="adminDashboardCard" href="/admin/users">
                <span className="adminMuted">Members</span>
                <span className="adminDashboardStat">{s.usersTotal ?? 0}</span>
                <span className="adminMuted">+{s.usersNewWeek ?? 0} this week</span>
              </Link>
              <Link className="adminDashboardCard" href="/admin/billing">
                <span className="adminMuted">Est. MRR</span>
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
          </AdminSectionCard>

          <AdminSectionCard title="Recent activity" description="Latest admin actions across the console.">
            {activities.length ? (
              <ul className="adminActivityFeed">
                {activities.map((a) => (
                  <li key={a.id}>
                    <span className="adminActivityFeed__when">
                      {String(a.createdAt || "").slice(0, 16).replace("T", " ")}
                    </span>
                    <strong>{a.summary}</strong>
                    <span className="adminMuted">{a.actorEmail ? ` · ${a.actorEmail}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <AdminEmptyState
                title="No activity yet"
                description="Actions across sponsors, community, billing, and content will appear here."
              />
            )}
          </AdminSectionCard>

          {data.recentBilling?.length ? (
            <AdminSectionCard title="Recent invoices" description="Latest recorded billing activity.">
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
                        <td>
                          <AdminStatusBadge status={r.status === "paid" ? "live" : "draft"}>
                            {r.status}
                          </AdminStatusBadge>
                        </td>
                        <td>{String(r.createdAt || "").slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminSectionCard>
          ) : null}

          <AdminAdvancedSettings
            title="Integrations & health"
            description="Technical billing configuration checks. Members never see this."
          >
            <ul className="adminMuted adminProse">
              <li>Stripe secret: {data.stripe?.secretConfigured ? "configured" : "missing"}</li>
              <li>Member recurring checkout: {data.stripe?.memberRecurring ? "yes" : "no"}</li>
              <li>Webhook: {data.stripe?.webhook ? "configured" : "missing"}</li>
            </ul>
            {data.disclaimer ? <p className="adminMuted">{data.disclaimer}</p> : null}
          </AdminAdvancedSettings>
        </>
      ) : null}
    </AdminPanelShell>
  );
}
