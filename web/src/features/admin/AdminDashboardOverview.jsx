"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const QUICK_ACTIONS = [
  { href: "/admin/content/create", label: "Create content", desc: "Guided wizard for pages, posts, and blocks" },
  { href: "/admin/sponsors", label: "Add sponsor", desc: "Catalog, categories, homepage featured" },
  { href: "/admin/community", label: "Review community", desc: "Moderation queue and staff posts" },
  { href: "/admin/podcasts", label: "Podcast applications", desc: "Guest applications and episodes" },
  { href: "/admin/trusted", label: "Trusted resource", desc: "Manual or EIN-backed listings" },
];

export default function AdminDashboardOverview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load dashboard summary.");
        setSummary(null);
        return;
      }
      setSummary(body.summary || {});
    } catch {
      setError("Could not load dashboard summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = summary?.communityPending ?? 0;
  const drafts = summary?.communityDrafts ?? 0;
  const podcastApps = summary?.podcastApplications ?? 0;

  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Dashboard
      </h1>
      <p className="adminMuted" style={{ lineHeight: 1.55 }}>
        Quick actions, moderation queues, and content health. Technical QA tools live under{" "}
        <Link href="/admin/advanced">Advanced</Link>.
      </p>

      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}

      <h2 style={{ fontSize: "1.1rem", marginTop: 24 }}>Quick actions</h2>
      <div className="adminDashboardGrid">
        {QUICK_ACTIONS.map((card) => (
          <Link key={card.href} className="adminDashboardCard" href={card.href}>
            <strong>{card.label}</strong>
            <span className="adminMuted">{card.desc}</span>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 28 }}>Queues & counts</h2>
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading && summary ? (
        <div className="adminDashboardGrid">
          <Link className="adminDashboardCard" href="/admin/community">
            <span className="adminMuted">Community moderation</span>
            <span className="adminDashboardStat">{pending}</span>
            <span className="adminMuted">pending review</span>
          </Link>
          <Link className="adminDashboardCard" href="/admin/community">
            <span className="adminMuted">Draft posts</span>
            <span className="adminDashboardStat">{drafts}</span>
            <span className="adminMuted">need attention</span>
          </Link>
          <Link className="adminDashboardCard" href="/admin/podcasts">
            <span className="adminMuted">Podcast applications</span>
            <span className="adminDashboardStat">{podcastApps}</span>
            <span className="adminMuted">total on file</span>
          </Link>
          <Link className="adminDashboardCard" href="/admin/sponsors">
            <span className="adminMuted">Active sponsors</span>
            <span className="adminDashboardStat">{summary.sponsorsActive ?? 0}</span>
          </Link>
          <Link className="adminDashboardCard" href="/admin/trusted">
            <span className="adminMuted">Trusted resources</span>
            <span className="adminDashboardStat">{summary.trustedActive ?? 0}</span>
            <span className="adminMuted">active listings</span>
          </Link>
          <Link className="adminDashboardCard" href="/admin/users">
            <span className="adminMuted">Member accounts</span>
            <span className="adminDashboardStat">{summary.users ?? 0}</span>
          </Link>
        </div>
      ) : null}

      <p style={{ marginTop: 24 }}>
        <Link className="btnSoft" href="/admin/content">
          Content manager hub
        </Link>{" "}
        <Link className="btnSoft" href="/admin/advanced">
          Advanced / QA
        </Link>
      </p>
    </div>
  );
}
