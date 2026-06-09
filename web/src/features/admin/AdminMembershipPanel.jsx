"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminMembershipPanel() {
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
        setStats(null);
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

  if (loading) return <p className="adminMuted">Loading membership analytics…</p>;
  if (error) {
    return (
      <p className="adminFeedback adminFeedback--error" role="alert">
        {error}
      </p>
    );
  }
  if (!stats) return null;

  return (
    <div className="adminPanel">
      <h2 className="adminBlockTitle">Membership analytics</h2>
      <p className="adminLead">
        Aggregates from profile records only — no Stripe secret keys or card data are shown here.
      </p>
      <div className="adminMembershipGrid">
        <div className="adminMembershipStat">
          <span className="adminMembershipStat__label">Total accounts</span>
          <strong>{stats.totalMembers}</strong>
        </div>
        <div className="adminMembershipStat">
          <span className="adminMembershipStat__label">Free</span>
          <strong>{stats.freeMembers}</strong>
        </div>
        <div className="adminMembershipStat">
          <span className="adminMembershipStat__label">Support</span>
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
          <span className="adminMembershipStat__label">Canceled subscriptions</span>
          <strong>{stats.canceledSubscriptions}</strong>
        </div>
        <div className="adminMembershipStat">
          <span className="adminMembershipStat__label">Past due / failed</span>
          <strong>{stats.pastDueOrFailed}</strong>
        </div>
      </div>
      <div className="adminActions">
        <button type="button" className="btnSoft" onClick={() => load()}>
          Refresh
        </button>
      </div>
    </div>
  );
}
