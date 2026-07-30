"use client";

import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { useCallback, useEffect, useState } from "react";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "support", label: "Support Member" },
  { value: "member", label: "Pro Member" },
  { value: "sponsor", label: "Sponsor" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
];
const USER_TYPE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "sponsor", label: "Sponsor" },
  { value: "resource_partner", label: "Trusted resource partner" },
  { value: "podcast_guest", label: "Podcast guest" },
  { value: "moderator", label: "Moderator" },
  { value: "organization_owner", label: "Organization owner" },
  { value: "guest", label: "Guest" },
];
const USER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
];

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
    <AdminPanelShell
      panelId="users"
      title="Members"
      description="Search people, update roles and account status, and review membership activity — without needing database tools."
      error={error}
    >
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="admin-q">
          Search by name or email
        </label>
        <input
          id="admin-q"
          className="adminConsoleInput"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Name or email"
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Search
        </button>
        <select className="adminConsoleInput" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="adminConsoleInput"
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
          aria-label="Filter by account type"
        >
          <option value="">All account types</option>
          {USER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="adminConsoleInput"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {USER_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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
      {loading ? <p className="adminMuted">Loading members…</p> : null}
      {!loading && rows.length === 0 ? (
        <AdminEmptyState
          title="No members match"
          description="Try a different search or clear the role and status filters."
        />
      ) : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Account type</th>
              <th>Status</th>
              <th>Membership</th>
              <th>Profile</th>
              <th>Last sign-in</th>
              <th className="adminAdvancedOnly">Billing ID</th>
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
                          `Give admin access to ${r.email || "this member"}? They will be able to open Admin Console.`,
                        )
                      ) {
                        return;
                      }
                      void patchUser(r.workos_user_id, { platform_role: nextRole });
                    }}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Account type">
                  <select
                    className="adminConsoleInput"
                    value={String(r.user_type || "member")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => void patchUser(r.workos_user_id, { user_type: e.target.value })}
                  >
                    {USER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Status">
                  <select
                    className="adminConsoleInput"
                    value={String(r.user_status || "active")}
                    disabled={saving === r.workos_user_id}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (
                        next === "suspended" &&
                        !window.confirm(`Suspend ${r.email || "this member"}? They will lose normal access until restored.`)
                      ) {
                        return;
                      }
                      void patchUser(r.workos_user_id, { user_status: next });
                    }}
                  >
                    {USER_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Membership">
                  {`${r.membership_tier || "—"} / ${r.membership_status || "—"}`}
                </td>
                <td data-label="Profile">
                  <div>
                    <strong>{r.onboarding_completed ? "Setup complete" : "Setup incomplete"}</strong>
                    {r.onboarding_skipped ? <span className="adminMuted"> · skipped</span> : null}
                  </div>
                  <div className="adminMuted adminMuted--sm">
                    Completeness:{" "}
                    {r.profile_completeness_percentage != null ? `${r.profile_completeness_percentage}%` : "—"}
                  </div>
                </td>
                <td data-label="Last sign-in">{r.last_login_at ? new Date(r.last_login_at).toLocaleString() : "—"}</td>
                <td data-label="Billing ID">{r.stripe_customer_id ? "Linked" : "—"}</td>
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
