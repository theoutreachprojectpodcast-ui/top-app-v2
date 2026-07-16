"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MEMBERSHIP_TIER_DEFINITIONS, MEMBERSHIP_TIER_KEYS } from "@/features/membership/membershipTiers";
import AdminScopeBanner from "@/components/admin/AdminScopeBanner";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

export default function AdminMembershipCenter() {
  const [stats, setStats] = useState(null);
  const [planConfig, setPlanConfig] = useState(null);
  const [supportReport, setSupportReport] = useState(null);
  const [audit, setAudit] = useState([]);
  const [environment, setEnvironment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [migrationDryRun, setMigrationDryRun] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [migrationVerification, setMigrationVerification] = useState(null);
  const [migrationBusy, setMigrationBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, planRes] = await Promise.all([
        fetch("/api/admin/membership/stats", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/membership/plan-availability", { credentials: "include", cache: "no-store" }),
      ]);
      const statsData = await statsRes.json().catch(() => ({}));
      const planData = await planRes.json().catch(() => ({}));
      if (!statsRes.ok) {
        setError(statsData.error || "Could not load membership stats.");
      } else {
        setStats(statsData.stats || null);
      }
      if (!planRes.ok) {
        setError((prev) => prev || planData.error || "Could not load plan availability.");
      } else {
        setPlanConfig(planData.configuration || null);
        setSupportReport(planData.supportReport || null);
        setAudit(Array.isArray(planData.audit) ? planData.audit : []);
        setEnvironment(String(planData.environment || ""));
      }
    } catch {
      setError("Could not load membership data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleSupport(nextEnabled) {
    const verb = nextEnabled ? "enable" : "disable";
    const confirmed = window.confirm(
      nextEnabled
        ? "Enabling Support Membership will make the plan visible during signup and allow new Support subscriptions. Existing entitlement rules and pricing will be restored from the saved configuration.\n\nContinue?"
        : "Disabling Support Membership will remove the plan from signup and prevent new Support subscriptions. Existing users and billing records will remain preserved.\n\nContinue?",
    );
    if (!confirmed) return;

    setSaving(true);
    setStatus("");
    setError("");
    try {
      const res = await fetch("/api/admin/membership/plan-availability", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supportMembershipEnabled: nextEnabled,
          confirm: true,
          reason: `Admin ${verb} Support Membership`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || `Could not ${verb} Support Membership.`);
        return;
      }
      setPlanConfig(data.configuration || null);
      setStatus(
        nextEnabled
          ? "Support Membership enabled — new Support checkouts are available."
          : "Support Membership disabled — platform is Pro-only for new purchases.",
      );
      await load();
    } catch {
      setError(`Network error while trying to ${verb} Support Membership.`);
    } finally {
      setSaving(false);
    }
  }

  async function runMigrationDryRun() {
    setMigrationBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/membership/support-to-pro-migration", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dry_run" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Dry run failed.");
        return;
      }
      setMigrationDryRun(data.dryRun || null);
      setStatus(
        `Dry run complete: ${data.dryRun?.summary?.eligible ?? 0} eligible, ${data.dryRun?.summary?.exceptions ?? 0} exceptions. No accounts were changed.`,
      );
    } catch {
      setError("Network error during migration dry run.");
    } finally {
      setMigrationBusy(false);
    }
  }

  async function runMigrationExecute() {
    const confirmed = window.confirm(
      "Run Support→Pro migration?\n\nEligible Support members will receive complimentary Pro access through the end of their original paid year. No new Stripe charges will be created. Support renewals will be set to cancel at period end.\n\nContinue?",
    );
    if (!confirmed) return;

    setMigrationBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/membership/support-to-pro-migration", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", confirm: true, sendEmail: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Migration execute failed.");
        return;
      }
      setMigrationResult(data.result || null);
      setMigrationVerification(data.verification || null);
      setStatus(
        `Migration complete: ${data.result?.migrated ?? 0} upgraded, ${data.result?.emailsSent ?? 0} emails sent, ${data.result?.emailsFailed ?? 0} email failures, ${data.result?.stripeCancelsApplied ?? 0} Stripe cancel-at-period-end updates.`,
      );
      await load();
    } catch {
      setError("Network error while executing migration.");
    } finally {
      setMigrationBusy(false);
    }
  }

  const supportEnabled = planConfig?.supportMembershipEnabled === true;
  const visibleTiers = MEMBERSHIP_TIER_DEFINITIONS.filter((tier) => {
    if (tier.id === MEMBERSHIP_TIER_KEYS.SUPPORT || tier.id === MEMBERSHIP_TIER_KEYS.ACCESS) {
      return supportEnabled || tier.legacy;
    }
    return !tier.internal;
  });

  return (
    <AdminPanelShell panelId="membership" error={error}>
      <AdminScopeBanner readiness="production" title="Plan availability">
        Support Membership is controlled by a platform feature flag (default off). Pro Membership remains the active
        paid product. Toggle changes are audited and do not delete users or billing history.
      </AdminScopeBanner>

      <p className="adminLead">
        Per-user membership changes are on the <Link href="/admin/users">Users</Link> screen. Stripe price IDs remain
        environment-configured.
      </p>

      {loading ? <p className="adminMuted">Loading…</p> : null}
      {status ? <p className="applyStatus">{status}</p> : null}

      <h2 className="adminSectionTitle">Plan availability</h2>
      <div className="adminEntityCard adminMt4">
        <div className="adminToolbar" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong>Support Membership</strong>
            <p className="adminMuted" style={{ margin: "4px 0 0" }}>
              Status: {supportEnabled ? "Enabled" : "Disabled"} · Environment: {environment || "unknown"}
              {planConfig?.updatedAt ? ` · Updated ${new Date(planConfig.updatedAt).toLocaleString()}` : ""}
              {planConfig?.updatedBy ? ` · by ${planConfig.updatedBy}` : ""}
            </p>
            <p className="adminMuted" style={{ margin: "4px 0 0" }}>
              Stripe Support price: {planConfig?.supportStripePriceId || "(not set)"} · Pro price:{" "}
              {planConfig?.proStripePriceId || "(not set)"}
            </p>
          </div>
          <button
            type="button"
            className={supportEnabled ? "btnSoft" : "btnPrimary"}
            disabled={saving || loading}
            onClick={() => void toggleSupport(!supportEnabled)}
          >
            {saving ? "Saving…" : supportEnabled ? "Disable Support Membership" : "Enable Support Membership"}
          </button>
        </div>
        <div className="adminToolbar adminMt4">
          <span className="adminMuted">Pro Membership: {planConfig?.proMembershipEnabled === false ? "Disabled" : "Enabled"}</span>
          <span className="adminMuted">Display: {planConfig?.proDisplayName || "Pro Membership"} ({planConfig?.proPriceLabel || "$5.99/yr"})</span>
        </div>
      </div>

      {supportReport ? (
        <>
          <h2 className="adminSectionTitle">Existing Support members (preserved)</h2>
          <div className="adminMembershipGrid adminMt4">
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Support profiles</span>
              <strong>{supportReport.totalSupportProfiles}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Active Support subs</span>
              <strong>{supportReport.activeSupportSubscriptions}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Canceled Support</span>
              <strong>{supportReport.canceledSupportSubscriptions}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Past due Support</span>
              <strong>{supportReport.pastDueSupportSubscriptions}</strong>
            </div>
          </div>
          <p className="adminMuted adminMt4">
            Use Support-to-Pro Migration below to grant complimentary Pro through each member&apos;s original paid
            period end. Do not cancel or refund Stripe subscriptions outside that controlled migration.
          </p>
        </>
      ) : null}

      <h2 className="adminSectionTitle">Support-to-Pro Migration</h2>
      <div className="adminEntityCard adminMt4">
        <p className="adminMuted" style={{ marginTop: 0 }}>
          Upgrades existing $0.99 Support members to complimentary Pro through the end of their original one-year paid
          term. Idempotent. No new charges. Sets Support subscriptions to cancel at period end when still renewing.
        </p>
        <div className="adminToolbar" style={{ gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btnSoft"
            disabled={migrationBusy || loading}
            onClick={() => void runMigrationDryRun()}
          >
            {migrationBusy ? "Working…" : "Preview dry run"}
          </button>
          <button
            type="button"
            className="btnPrimary"
            disabled={migrationBusy || loading}
            onClick={() => void runMigrationExecute()}
          >
            {migrationBusy ? "Working…" : "Run migration"}
          </button>
        </div>
        {migrationDryRun?.summary ? (
          <div className="adminMembershipGrid adminMt4">
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Discovered</span>
              <strong>{migrationDryRun.summary.totalDiscovered}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Eligible</span>
              <strong>{migrationDryRun.summary.eligible}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Already Pro</span>
              <strong>{migrationDryRun.summary.alreadyPaidPro}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Expired</span>
              <strong>{migrationDryRun.summary.expired}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Exceptions</span>
              <strong>{migrationDryRun.summary.exceptions}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Stripe cancel@period end</span>
              <strong>{migrationDryRun.summary.proposedStripeCancelAtPeriodEnd}</strong>
            </div>
          </div>
        ) : null}
        {migrationResult ? (
          <p className="adminMuted adminMt4">
            Last execute: migrated {migrationResult.migrated}, emails sent {migrationResult.emailsSent}, email failures{" "}
            {migrationResult.emailsFailed}, Stripe cancels {migrationResult.stripeCancelsApplied}, errors{" "}
            {migrationResult.errors?.length || 0}.
          </p>
        ) : null}
        {migrationVerification ? (
          <p className="adminMuted adminMt4">
            Verification — active Support: {migrationVerification.activeSupportUsers}, active migrated Pro:{" "}
            {migrationVerification.activeMigratedProUsers}, missing expiry:{" "}
            {migrationVerification.migratedUsersMissingExpiration}, ok: {migrationVerification.ok ? "yes" : "no"}.
          </p>
        ) : null}
        {migrationDryRun?.candidates?.length ? (
          <div className="adminPanelBody adminPanelBody--loose adminMt4" style={{ maxHeight: 320, overflow: "auto" }}>
            {migrationDryRun.candidates.slice(0, 100).map((row) => (
              <article key={row.workosUserId} className="adminEntityCard adminEntityCard--compact">
                <div className="adminMuted adminEntityCard__meta">
                  {row.status} · {row.email || "no email"} · {row.displayName || "—"}
                </div>
                <p className="adminEntityCard__body--pre" style={{ margin: 0 }}>
                  Period: {row.originalSupportPeriodStart || "—"} → {row.originalSupportPeriodEnd || "—"}
                  {row.exceptionReason ? ` · ${row.exceptionReason}` : ""}
                  {row.proposedStripeCancelAtPeriodEnd ? " · will cancel@period end" : ""}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {stats ? (
        <>
          <h2 className="adminSectionTitle">Membership counts</h2>
          <div className="adminMembershipGrid adminMt4">
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Total accounts</span>
              <strong>{stats.totalMembers}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Free</span>
              <strong>{stats.freeMembers}</strong>
            </div>
            <div className="adminMembershipStat">
              <span className="adminMembershipStat__label">Support (legacy/historical)</span>
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
          </div>
        </>
      ) : null}

      <h2 className="adminSectionTitle">Tier catalog</h2>
      <div className="adminPanelBody adminPanelBody--loose">
        {visibleTiers.map((tier) => (
          <article key={tier.id} className="adminEntityCard">
            <strong>{tier.label}</strong>
            {tier.priceLabel ? <span className="adminMuted"> — {tier.priceLabel}</span> : null}
            {tier.legacy ? <span className="adminMuted"> (legacy / flag-gated)</span> : null}
            <ul className="adminListPlain adminMt4">
              {tier.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {audit.length ? (
        <>
          <h2 className="adminSectionTitle">Configuration audit</h2>
          <div className="adminPanelBody adminPanelBody--loose">
            {audit.map((row) => (
              <article key={row.id} className="adminEntityCard adminEntityCard--compact">
                <div className="adminMuted adminEntityCard__meta">
                  {row.action} · {row.actor_email || "unknown"} · {row.environment || "—"} ·{" "}
                  {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                </div>
                {row.reason ? <p className="adminEntityCard__body--pre">{row.reason}</p> : null}
              </article>
            ))}
          </div>
        </>
      ) : null}

      <div className="adminActions">
        <Link className="btnSoft" href="/admin/billing">
          Billing & forecasts
        </Link>
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading || saving}>
          Refresh
        </button>
      </div>
    </AdminPanelShell>
  );
}
