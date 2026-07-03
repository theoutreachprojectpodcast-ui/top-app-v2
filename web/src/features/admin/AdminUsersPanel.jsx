"use client";

import AdminPanelShell from "@/components/admin/AdminPanelShell";
import { useCallback, useEffect, useState } from "react";

const ROLE_OPTIONS = ["user", "support", "member", "sponsor", "moderator", "admin"];
const USER_TYPE_OPTIONS = [
  "member",
  "admin",
  "sponsor",
  "resource_partner",
  "podcast_guest",
  "moderator",
  "organization_owner",
  "guest",
];
const USER_STATUS_OPTIONS = ["active", "invited", "suspended"];

export default function AdminUsersPanel() {
  const [qInput, setQInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteInfo, setInviteInfo] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (qInput.trim()) params.set("q", qInput.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (userTypeFilter) params.set("userType", userTypeFilter);
      params.set("limit", "60");
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load users.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setError("Could not load users.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [qInput, roleFilter, statusFilter, userTypeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDetail(workosUserId) {
    if (!workosUserId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(workosUserId)}/activity`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDetail(data);
      else setDetail(null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function applyPreset(preset) {
    if (preset === "active") setStatusFilter("active");
    else if (preset === "suspended") setStatusFilter("suspended");
    else if (preset === "invited") setStatusFilter("invited");
    else if (preset === "new") {
      setStatusFilter("");
      setQInput("");
    }
    void load();
  }

  async function patchUser(workosUserId, patch) {
    setSaving(workosUserId);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(workosUserId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving("");
    }
  }

  async function sendInviteMagicLink() {
    const email = String(inviteEmail || "").trim();
    if (!email) return;
    setInviteInfo("");
    setError("");
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not generate admin sign-in link.");
        return;
      }
      setInviteInfo("Magic link flow opened in hosted sign-in.");
      if (data.signInUrl) {
        window.open(String(data.signInUrl), "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Could not generate admin sign-in link.");
    }
  }

  return (
    <AdminPanelShell panelId="users" error={error}>
            <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="admin-q">
          Search
        </label>
        <input
          id="admin-q"
          className="adminConsoleInput"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="email or name"
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Search
        </button>
        <select className="adminConsoleInput" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <select className="adminConsoleInput" value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)}>
          <option value="">All user types</option>
          {USER_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <select className="adminConsoleInput" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {USER_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="admin-invite-email">
          Admin Sign In
        </label>
        <input
          id="admin-invite-email"
          className="adminConsoleInput"
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="admin email"
        />
        <button type="button" className="btnSoft" onClick={() => void sendInviteMagicLink()}>
          Send Magic Link
        </button>
        {inviteInfo ? <span className="adminMuted">{inviteInfo}</span> : null}
      </div>
      {error ? (
        <p className="adminFeedback adminFeedback--error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {(!loading && rows.length === 0) ? <p className="adminMuted">No users.</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>User Type</th>
              <th>Status</th>
              <th>Membership</th>
              <th>Onboarding / profile</th>
              <th>Last Login</th>
              <th>Stripe</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                style={selectedId === r.workos_user_id ? { background: "color-mix(in srgb, var(--color-accent) 6%, transparent)" } : undefined}
                onClick={() => {
                  setSelectedId(r.workos_user_id);
                  void loadDetail(r.workos_user_id);
                }}
              >
                <td data-label="Email">{r.email || "—"}</td>
                <td data-label="Name">
                  {(r.first_name || "") + " " + (r.last_name || "")}
                  <div className="adminMuted adminMuted--xs">
                    {r.workos_user_id}
                  </div>
                </td>
                <td data-label="Role">
                  <select
                    className="adminConsoleInput"
                    value={String(r.platform_role || "user")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      if (
                        nextRole === "admin" &&
                        !window.confirm(
                          `Confirm admin promotion for ${r.email || r.workos_user_id}? This grants full admin access.`,
                        )
                      ) {
                        return;
                      }
                      void patchUser(r.workos_user_id, { platform_role: nextRole });
                    }}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="User Type">
                  <select
                    className="adminConsoleInput"
                    value={String(r.user_type || "member")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => void patchUser(r.workos_user_id, { user_type: e.target.value })}
                  >
                    {USER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Status">
                  <select
                    className="adminConsoleInput"
                    value={String(r.user_status || "active")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => void patchUser(r.workos_user_id, { user_status: e.target.value })}
                  >
                    {USER_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Membership">
                  {r.membership_tier} / {r.membership_status}
                </td>
                <td data-label="Onboarding / profile">
                  <div>
                    <strong>{r.onboarding_completed ? "Wizard complete" : "Wizard incomplete"}</strong>
                    {r.onboarding_skipped ? <span className="adminMuted"> · skipped</span> : null}
                  </div>
                  <div className="adminMuted adminMuted--sm">
                    Status: {r.onboarding_status || "—"}
                  </div>
                  <div className="adminMuted adminMuted--sm">
                    Identity: {r.identity_segment || "—"} · User type: {r.user_type || "—"}
                  </div>
                  <div className="adminMuted adminMuted--sm">
                    Completeness:{" "}
                    {r.profile_completeness_percentage != null ? `${r.profile_completeness_percentage}%` : "—"}
                  </div>
                  <div className="adminMuted adminMuted--xs adminMuted--clamp">
                    Missing:{" "}
                    {Array.isArray(r.profile_completeness_missing_fields) && r.profile_completeness_missing_fields.length
                      ? r.profile_completeness_missing_fields.join(", ")
                      : "—"}
                  </div>
                  <div className="adminMuted adminMuted--xs">
                    Setup done:{" "}
                    {r.account_setup_completed_at ? new Date(r.account_setup_completed_at).toLocaleString() : "—"}
                  </div>
                  <div className="adminMuted adminMuted--xs">
                    Profile updated:{" "}
                    {r.profile_last_updated_at ? new Date(r.profile_last_updated_at).toLocaleString() : "—"}
                  </div>
                </td>
                <td data-label="Last Login">{r.last_login_at ? new Date(r.last_login_at).toLocaleString() : "—"}</td>
                <td data-label="Stripe">{r.stripe_customer_id ? "yes" : "—"}</td>
                <td data-label="Actions" className="adminActionCell" onClick={(e) => e.stopPropagation()}>
                  <select
                    className="adminConsoleInput"
                    value={String(r.membership_tier || "free")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => patchUser(r.workos_user_id, { membership_tier: e.target.value })}
                  >
                    {["free", "support", "member", "sponsor"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <select
                    className="adminConsoleInput"
                    value={String(r.membership_status || "none")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => patchUser(r.workos_user_id, { membership_status: e.target.value })}
                  >
                    {["none", "pending", "active", "past_due", "canceled", "incomplete"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btnSoft"
                    disabled={saving === r.workos_user_id}
                    onClick={() => {
                      if (!window.confirm("Reset onboarding for this user?")) return;
                      void patchUser(r.workos_user_id, { reset_onboarding: true });
                    }}
                  >
                    Reset onboarding
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId ? (
        <div className="adminPanel adminDetailPanel">
          <h2 className="adminSectionTitle">User detail</h2>
          {detailLoading ? <p className="adminMuted">Loading activity…</p> : null}
          {detail?.profile ? (
            <>
              <p className="adminMuted">
                {detail.profile.email} · created {detail.profile.created_at ? new Date(detail.profile.created_at).toLocaleString() : "—"}
              </p>
              <p className="adminMuted">{detail.billingNote}</p>
              <h3 className="adminBlockTitle">Community posts ({detail.communityPosts?.length || 0})</h3>
              <ul className="adminListPlain">
                {(detail.communityPosts || []).slice(0, 8).map((p) => (
                  <li key={p.id}>
                    {p.title || "(no title)"} — {p.status} — {String(p.created_at || "").slice(0, 10)}
                  </li>
                ))}
              </ul>
              <h3 className="adminBlockTitle">Podcast applications</h3>
              <ul className="adminListPlain">
                {(detail.podcastApplications || []).map((a) => (
                  <li key={a.id}>
                    {a.full_name} — {a.status}
                  </li>
                ))}
              </ul>
              <h3 className="adminBlockTitle">Sponsor applications</h3>
              <ul className="adminListPlain">
                {(detail.sponsorApplications || []).map((a) => (
                  <li key={a.id}>
                    {a.organization_name || "—"} — {a.status}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <button type="button" className="btnSoft" onClick={() => setSelectedId("")}>
            Close detail
          </button>
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
