"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MEMBERSHIP_TIER_DEFINITIONS } from "@/features/membership/membershipTiers";
import AdminScopeBanner from "@/components/admin/AdminScopeBanner";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

export default function AdminMembershipCenter() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/membership/stats", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load membership stats.");
        return;
      }
      setStats(data.stats || null);
    } catch {
      setError("Could not load membership stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminPanelShell panelId="membership" error={error}>
      <AdminScopeBanner readiness="partial" title="Pricing & benefits editing">
        Tier copy and Stripe price IDs are not yet editable from admin without a deploy. Stats and user-level status
        changes are live.
      </AdminScopeBanner>

      <p className="adminMuted">
        Tier definitions are code-driven today ({`MEMBERSHIP_TIER_DEFINITIONS`}) with Stripe price IDs in environment
        variables. Per-user membership changes are on the <Link href="/admin/users">Users</Link> screen.
      </p>

      {loading ? <p className="adminMuted">Loading…</p> : null}

      {stats ? (
        <div className="adminMembershipGrid" style={{ marginTop: 16 }}>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Total accounts</span>
            <strong>{stats.totalMembers}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Free</span>
            <strong>{stats.freeMembers}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Support ($1/mo)</span>
            <strong>{stats.supportMembers}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Pro</span>
            <strong>{stats.proMembers}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Sponsor tier</span>
            <strong>{stats.sponsorMembers}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Active subscriptions</span>
            <strong>{stats.activeSubscriptions}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Canceled</span>
            <strong>{stats.canceledSubscriptions}</strong>
          </div>
          <div className="adminMembershipStat">
            <span className="adminMembershipStat__label">Past due / failed</span>
            <strong>{stats.pastDueOrFailed}</strong>
          </div>
        </div>
      ) : null}

      <h2 style={{ fontSize: "1.05rem", marginTop: 28 }}>Tier catalog (read-only)</h2>
      <div className="adminPanelBody">
        {MEMBERSHIP_TIER_DEFINITIONS.map((tier) => (
          <article
            key={tier.id}
            style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 10, padding: 14 }}
          >
            <strong>{tier.label}</strong>
            {tier.priceLabel ? <span className="adminMuted"> — {tier.priceLabel}</span> : null}
            <ul style={{ margin: "8px 0 0", paddingLeft: "1.1rem", fontSize: "0.875rem" }}>
              {tier.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p style={{ marginTop: 16 }}>
        <Link className="btnSoft" href="/admin/billing">
          Billing & forecasts
        </Link>{" "}
        <button type="button" className="btnSoft" onClick={() => void load()}>
          Refresh
        </button>
      </p>
    </AdminPanelShell>
  );
}
