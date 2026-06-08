"use client";

import { useCallback, useEffect, useState } from "react";
import SponsorAdminReviewSection from "@/features/sponsors/components/SponsorAdminReviewSection";
import SponsorLogoReviewPanel from "@/features/sponsors/admin/SponsorLogoReviewPanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

const EDIT_KEYS = [
  "name",
  "sponsor_type",
  "sponsor_category",
  "cta_label",
  "website_url",
  "social_links",
  "logo_url",
  "background_image_url",
  "short_description",
  "long_description",
  "tagline",
  "instagram_url",
  "facebook_url",
  "linkedin_url",
  "twitter_url",
  "youtube_url",
  "featured",
  "display_order",
  "verified",
  "sponsor_scope",
  "sponsor_status",
  "mission_partner",
  "podcast_sponsor",
  "supporting_sponsor",
  "is_active",
  "payment_status",
  "onboarding_status",
  "admin_notes",
];

function hydrateForm(row) {
  const next = {};
  for (const k of EDIT_KEYS) {
    if (k === "featured" || k === "verified" || k === "mission_partner" || k === "podcast_sponsor" || k === "supporting_sponsor" || k === "is_active") {
      next[k] = row[k] ? "true" : "false";
    } else if (k === "display_order") {
      next[k] = row[k] != null ? String(row[k]) : "0";
    } else if (k === "social_links") {
      next[k] = JSON.stringify(row[k] || {}, null, 2);
    } else {
      next[k] = row[k] != null ? String(row[k]) : "";
    }
  }
  return next;
}

export default function AdminSponsorsPanel() {
  const [rows, setRows] = useState([]);
  const [slug, setSlug] = useState("");
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sponsors", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load.");
        setRows([]);
        return;
      }
      const list = Array.isArray(data.rows) ? data.rows : [];
      setRows(list);
      setSlug((prev) => {
        if (!list.length) return "";
        if (prev && list.some((r) => r.slug === prev)) return prev;
        const first = list[0];
        setForm(hydrateForm(first));
        return first.slug;
      });
    } catch {
      setError("Could not load.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const row = rows.find((r) => r.slug === slug);
    if (row) setForm(hydrateForm(row));
  }, [slug, rows]);

  async function save() {
    if (!slug) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const body = {};
      for (const k of EDIT_KEYS) {
        const v = form[k];
        if (k === "featured" || k === "verified" || k === "mission_partner" || k === "podcast_sponsor" || k === "supporting_sponsor" || k === "is_active") {
          body[k] = v === "true";
        } else if (k === "display_order") {
          body[k] = parseInt(String(v), 10) || 0;
        } else if (k === "social_links") {
          const raw = String(v || "").trim();
          if (!raw) {
            body[k] = null;
          } else {
            try {
              const parsed = JSON.parse(raw);
              body[k] = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
            } catch {
              setError("social_links must be valid JSON.");
              setSaving(false);
              return;
            }
          }
        } else {
          body[k] = v;
        }
      }
      const res = await fetch(`/api/admin/sponsors/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      setStatus("Saved.");
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveWithBody(extra) {
    if (!slug) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/sponsors/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extra),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      setStatus("Saved.");
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function createSponsor() {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/sponsors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mission_partner: true,
          featured: false,
          sponsor_display_group: "mission_partner",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Create failed.");
        return;
      }
      setCreateName("");
      setStatus(`Created ${data.row?.slug || "sponsor"}.`);
      await load();
      if (data.row?.slug) setSlug(data.row.slug);
    } catch {
      setError("Create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function bumpOrder(delta) {
    if (!slug) return;
    const row = rows.find((r) => r.slug === slug);
    if (!row) return;
    const next = (parseInt(String(row.display_order), 10) || 0) + delta;
    setForm((f) => ({ ...f, display_order: String(next) }));
    await saveWithBody({ display_order: next });
  }

  return (
    <AdminPanelShell panelId="sponsors" error={error} message={status}>
      <div className="adminFieldStack" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Add sponsor</h3>
        <div className="adminToolbar">
          <input
            className="adminConsoleInput"
            placeholder="Sponsor name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="button" className="btnPrimary" disabled={creating || !createName.trim()} onClick={() => void createSponsor()}>
            Add sponsor
          </button>
        </div>
      </div>
      <div className="adminToolbar">
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading && rows.length === 0 ? <p className="adminMuted">No sponsors.</p> : null}
      {rows.length > 0 ? (
        <div style={{ marginBottom: "12px" }}>
          <label className="fieldLabel" htmlFor="sp-select">
            Sponsor
          </label>
          <select
            id="sp-select"
            className="adminConsoleInput"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ width: "100%", maxWidth: "560px" }}
          >
            {rows.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name} ({r.slug})
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {slug ? (
        <div className="adminFieldStack">
          {EDIT_KEYS.map((key) => (
            <div key={key}>
              <label className="fieldLabel" htmlFor={`sp-${key}`}>
                {key}
              </label>
              {key === "short_description" || key === "long_description" || key === "social_links" ? (
                <textarea
                  id={`sp-${key}`}
                  className="adminConsoleInput"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              ) : key === "featured" || key === "verified" || key === "mission_partner" || key === "podcast_sponsor" || key === "supporting_sponsor" || key === "is_active" ? (
                <select
                  id={`sp-${key}`}
                  className="adminConsoleInput"
                  value={form[key] ?? "false"}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  id={`sp-${key}`}
                  className="adminConsoleInput"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="adminToolbar">
            <button type="button" className="btnSoft" disabled={saving} onClick={() => void bumpOrder(-1)}>
              Order −
            </button>
            <button type="button" className="btnSoft" disabled={saving} onClick={() => void bumpOrder(1)}>
              Order +
            </button>
            <button type="button" className="btnPrimary" disabled={saving} onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      ) : null}
      <hr className="adminRule" style={{ margin: "16px 0" }} />
      <SponsorAdminReviewSection showAdmin supabase={null} />
      <SponsorLogoReviewPanel showAdmin onChanged={() => void load()} />
    </AdminPanelShell>
  );
}
