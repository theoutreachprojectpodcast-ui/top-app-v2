"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SponsorAdminReviewSection from "@/features/sponsors/components/SponsorAdminReviewSection";
import SponsorLogoReviewPanel from "@/features/sponsors/admin/SponsorLogoReviewPanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

const TAB_CONTENT = "content";
const TAB_LINKS = "links";
const TAB_PUBLISH = "publish";
const TAB_RESEARCH = "research";

const EDIT_KEYS = [
  "name",
  "sponsor_type",
  "sponsor_category",
  "tagline",
  "short_description",
  "long_description",
  "logo_url",
  "background_image_url",
  "featured_items",
  "website_url",
  "cta_url",
  "cta_label",
  "promo_code",
  "inquiry_url",
  "social_links",
  "instagram_url",
  "facebook_url",
  "linkedin_url",
  "twitter_url",
  "youtube_url",
  "publish_status",
  "sponsor_scope",
  "sponsor_status",
  "featured",
  "display_order",
  "verified",
  "mission_partner",
  "veteran_owned",
  "podcast_sponsor",
  "supporting_sponsor",
  "is_active",
  "payment_status",
  "onboarding_status",
  "admin_notes",
];

const TAB_FIELDS = {
  [TAB_CONTENT]: [
    "name",
    "sponsor_type",
    "sponsor_category",
    "tagline",
    "short_description",
    "long_description",
    "logo_url",
    "background_image_url",
    "featured_items",
  ],
  [TAB_LINKS]: [
    "website_url",
    "cta_url",
    "cta_label",
    "promo_code",
    "inquiry_url",
    "social_links",
    "instagram_url",
    "facebook_url",
    "linkedin_url",
    "twitter_url",
    "youtube_url",
  ],
  [TAB_PUBLISH]: [
    "publish_status",
    "sponsor_scope",
    "sponsor_status",
    "is_active",
    "featured",
    "mission_partner",
    "veteran_owned",
    "podcast_sponsor",
    "supporting_sponsor",
    "verified",
    "display_order",
    "payment_status",
    "onboarding_status",
    "admin_notes",
  ],
};

const BOOL_KEYS = new Set([
  "featured",
  "verified",
  "mission_partner",
  "veteran_owned",
  "podcast_sponsor",
  "supporting_sponsor",
  "is_active",
]);

const TEXTAREA_KEYS = new Set(["short_description", "long_description", "social_links", "featured_items", "admin_notes"]);

function hydrateForm(row) {
  const next = {};
  for (const k of EDIT_KEYS) {
    if (BOOL_KEYS.has(k)) {
      next[k] = row[k] ? "true" : "false";
    } else if (k === "display_order") {
      next[k] = row[k] != null ? String(row[k]) : "0";
    } else if (k === "social_links") {
      next[k] = JSON.stringify(row[k] || {}, null, 2);
    } else if (k === "featured_items") {
      next[k] = JSON.stringify(row[k] || [], null, 2);
    } else if (k === "publish_status") {
      next[k] = row[k] ? String(row[k]) : "published";
    } else {
      next[k] = row[k] != null ? String(row[k]) : "";
    }
  }
  return next;
}

function applyResearchDraftToForm(form, draft) {
  if (!draft || typeof draft !== "object") return form;
  const next = { ...form };
  const map = {
    tagline: draft.tagline,
    short_description: draft.short_description,
    long_description: draft.long_description,
    website_url: draft.website_url,
    logo_url: draft.logo_url,
    background_image_url: draft.background_image_url,
    sponsor_category: draft.sponsor_category,
    instagram_url: draft.instagram_url,
    facebook_url: draft.facebook_url,
    linkedin_url: draft.linkedin_url,
    twitter_url: draft.twitter_url,
    youtube_url: draft.youtube_url,
    promo_code: draft.promo_code,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value != null && String(value).trim()) next[key] = String(value).trim();
  }
  if (draft.name && !String(next.name || "").trim()) next.name = String(draft.name).trim();
  return next;
}

function renderField(key, form, setForm) {
  if (key === "publish_status") {
    return (
      <select
        id={`sp-${key}`}
        className="adminConsoleInput"
        value={form[key] ?? "published"}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      >
        <option value="draft">draft</option>
        <option value="published">published</option>
        <option value="archived">archived</option>
      </select>
    );
  }
  if (TEXTAREA_KEYS.has(key)) {
    return (
      <textarea
        id={`sp-${key}`}
        className="adminConsoleInput"
        rows={key === "featured_items" ? 6 : 4}
        value={form[key] ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    );
  }
  if (BOOL_KEYS.has(key)) {
    return (
      <select
        id={`sp-${key}`}
        className="adminConsoleInput"
        value={form[key] ?? "false"}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  return (
    <input
      id={`sp-${key}`}
      className="adminConsoleInput"
      value={form[key] ?? ""}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
    />
  );
}

export default function AdminSponsorsPanel() {
  const [rows, setRows] = useState([]);
  const [slug, setSlug] = useState("");
  const [form, setForm] = useState({});
  const [tab, setTab] = useState(TAB_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchDraft, setResearchDraft] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedRow = useMemo(() => rows.find((r) => r.slug === slug) || null, [rows, slug]);

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
    if (row) {
      setForm(hydrateForm(row));
      setResearchDraft(null);
    }
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
        if (BOOL_KEYS.has(k)) {
          body[k] = v === "true";
        } else if (k === "display_order") {
          body[k] = parseInt(String(v), 10) || 0;
        } else if (k === "social_links") {
          const raw = String(v || "").trim();
          if (!raw) body[k] = null;
          else {
            try {
              const parsed = JSON.parse(raw);
              body[k] = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
            } catch {
              setError("social_links must be valid JSON.");
              setSaving(false);
              return;
            }
          }
        } else if (k === "featured_items") {
          const raw = String(v || "").trim();
          if (!raw) body[k] = [];
          else {
            try {
              const parsed = JSON.parse(raw);
              body[k] = Array.isArray(parsed) ? parsed : [];
            } catch {
              setError("featured_items must be a JSON array.");
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

  async function runWebsiteResearch() {
    if (!slug) return;
    setResearching(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/sponsors/${encodeURIComponent(slug)}/research`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: form.website_url || selectedRow?.website_url || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Website review failed.");
        return;
      }
      setResearchDraft(data.draft || null);
      setStatus("Website review complete. Apply the draft when ready — nothing is published automatically.");
      setTab(TAB_RESEARCH);
    } catch {
      setError("Website review failed.");
    } finally {
      setResearching(false);
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

  const activeFields = TAB_FIELDS[tab] || [];

  return (
    <AdminPanelShell panelId="sponsors" error={error} message={status}>
      <div className="adminFieldStack adminFieldStack--bordered">
        <h3 className="adminBlockTitle">Add sponsor</h3>
        <div className="adminToolbar">
          <input
            className="adminConsoleInput adminConsoleInput--grow"
            placeholder="Sponsor name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
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
        <div className="adminSelectField">
          <label className="fieldLabel" htmlFor="sp-select">
            Sponsor
          </label>
          <select id="sp-select" className="adminConsoleInput" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {rows.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name} ({r.slug}) · {r.publish_status || "published"}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {slug ? (
        <div className="adminFieldStack">
          <div className="adminToolbar adminToolbar--wrap">
            {[
              [TAB_CONTENT, "Content"],
              [TAB_LINKS, "Links & CTA"],
              [TAB_PUBLISH, "Publish"],
              [TAB_RESEARCH, "Research"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "btnPrimary" : "btnSoft"}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
            <Link className="btnSoft" href={`/sponsors/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer">
              Preview profile
            </Link>
          </div>

          {tab === TAB_RESEARCH ? (
            <div className="adminFieldStack">
              <p className="adminMuted">
                Review the sponsor website and stage a draft profile. Drafts are stored in enrichment and never go live until you save.
              </p>
              <div className="adminToolbar">
                <button type="button" className="btnSoft" disabled={researching} onClick={() => void runWebsiteResearch()}>
                  {researching ? "Reviewing…" : "Review website"}
                </button>
                <button
                  type="button"
                  className="btnPrimary"
                  disabled={!researchDraft}
                  onClick={() => {
                    setForm((f) => applyResearchDraftToForm(f, researchDraft));
                    setStatus("Draft applied to the editor. Switch to Content or Links and save to publish.");
                    setTab(TAB_CONTENT);
                  }}
                >
                  Apply draft to form
                </button>
              </div>
              {researchDraft ? (
                <textarea
                  className="adminConsoleInput"
                  rows={16}
                  readOnly
                  value={JSON.stringify(researchDraft, null, 2)}
                />
              ) : (
                <p className="adminMuted">No research draft yet. Run a website review to generate one.</p>
              )}
            </div>
          ) : (
            activeFields.map((key) => (
              <div key={key}>
                <label className="fieldLabel" htmlFor={`sp-${key}`}>
                  {key}
                </label>
                {renderField(key, form, setForm)}
              </div>
            ))
          )}

          {tab === TAB_PUBLISH ? (
            <div className="adminToolbar">
              <button type="button" className="btnSoft" disabled={saving} onClick={() => void saveWithBody({ publish_status: "draft" })}>
                Mark draft
              </button>
              <button type="button" className="btnPrimary" disabled={saving} onClick={() => void saveWithBody({ publish_status: "published" })}>
                Publish
              </button>
              <button type="button" className="btnSoft" disabled={saving} onClick={() => void saveWithBody({ publish_status: "archived" })}>
                Archive
              </button>
            </div>
          ) : null}

          <div className="adminToolbar">
            {tab === TAB_PUBLISH ? (
              <>
                <button type="button" className="btnSoft" disabled={saving} onClick={() => void bumpOrder(-1)}>
                  Order −
                </button>
                <button type="button" className="btnSoft" disabled={saving} onClick={() => void bumpOrder(1)}>
                  Order +
                </button>
              </>
            ) : null}
            <button type="button" className="btnPrimary" disabled={saving} onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      ) : null}
      <hr className="adminRule" />
      <SponsorAdminReviewSection showAdmin supabase={null} />
      <SponsorLogoReviewPanel showAdmin onChanged={() => void load()} />
    </AdminPanelShell>
  );
}
