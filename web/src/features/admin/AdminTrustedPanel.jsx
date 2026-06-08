"use client";

import { useCallback, useEffect, useState } from "react";

const EDIT_KEYS = [
  "display_name",
  "website_url",
  "logo_url",
  "header_image_url",
  "short_description",
  "mission",
  "long_description",
  "who_they_serve",
  "services",
  "service_area",
  "donation_url",
  "volunteer_url",
  "intake_url",
  "events_url",
  "resource_library_url",
  "resource_links",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "x_url",
  "linkedin_url",
  "tiktok_url",
  "contact_email",
  "contact_phone",
  "listing_status",
  "sort_order",
  "last_reviewed_at",
  "source_notes",
  "detail_review_status",
  "detail_field_sources",
  "featured",
  "admin_notes",
];

const TEXTAREA_KEYS = new Set([
  "short_description",
  "mission",
  "long_description",
  "who_they_serve",
  "services",
  "resource_links",
  "detail_field_sources",
  "source_notes",
  "admin_notes",
]);

function hydrateForm(row) {
  const next = {};
  for (const k of EDIT_KEYS) {
    if (k === "sort_order") next[k] = row[k] != null ? String(row[k]) : "0";
    else if (
      (k === "resource_links" || k === "detail_field_sources") &&
      row[k] != null &&
      typeof row[k] === "object"
    ) {
      next[k] = JSON.stringify(row[k], null, 2);
    } else if (k === "featured") {
      next[k] = row[k] ? "true" : "false";
    } else if (k === "last_reviewed_at" && row[k]) {
      const d = new Date(row[k]);
      next[k] = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    } else next[k] = row[k] != null ? String(row[k]) : "";
  }
  return next;
}

export default function AdminTrustedPanel() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    display_name: "",
    website_url: "",
    logo_url: "",
    header_image_url: "",
    short_description: "",
    listing_status: "pending",
    featured: false,
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/trusted", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load.");
        setRows([]);
        return;
      }
      const list = Array.isArray(data.rows) ? data.rows : [];
      setRows(list);
      setSelectedId((prev) => {
        if (!list.length) return "";
        if (prev && list.some((r) => r.id === prev)) return prev;
        const first = list[0];
        setForm(hydrateForm(first));
        return first.id;
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
    const row = rows.find((r) => r.id === selectedId);
    if (row) setForm(hydrateForm(row));
  }, [selectedId, rows]);

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const body = { ...form };
      if (body.sort_order != null) body.sort_order = parseInt(String(body.sort_order), 10) || 0;
      if (body.resource_links) {
        const raw = String(body.resource_links).trim();
        if (!raw) body.resource_links = null;
        else body.resource_links = JSON.parse(raw);
      }
      if (body.detail_field_sources) {
        const raw = String(body.detail_field_sources).trim();
        if (!raw) body.detail_field_sources = {};
        else body.detail_field_sources = JSON.parse(raw);
      }
      if (body.featured != null) {
        body.featured = String(body.featured).toLowerCase() === "true";
      }
      if (body.last_reviewed_at) {
        body.last_reviewed_at = new Date(String(body.last_reviewed_at)).toISOString();
      } else if (body.last_reviewed_at === "") {
        body.last_reviewed_at = null;
      }
      const res = await fetch(`/api/admin/trusted/${encodeURIComponent(selectedId)}`, {
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

  async function createResource() {
    const name = String(createForm.display_name || "").trim();
    if (!name) {
      setError("Organization name is required.");
      return;
    }
    setCreating(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/trusted", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, featured: createForm.featured }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Create failed.");
        return;
      }
      setStatus("Trusted resource created.");
      setShowCreate(false);
      setCreateForm({
        display_name: "",
        website_url: "",
        logo_url: "",
        header_image_url: "",
        short_description: "",
        listing_status: "pending",
        featured: false,
      });
      await load();
      if (data.row?.id) setSelectedId(data.row.id);
    } catch {
      setError("Create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function scrapeWebsite() {
    if (!selectedId) return;
    setScraping(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/trusted/${encodeURIComponent(selectedId)}/scrape`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Scrape failed.");
        return;
      }
      setStatus("Website metadata scraped (fills empty fields only).");
      await load();
    } catch {
      setError("Scrape failed.");
    } finally {
      setScraping(false);
    }
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Trusted resources</h2>
      <p className="adminMuted">Edits `trusted_resources` (service role). Public listing still respects RLS for anon/authenticated clients.</p>
      <div className="adminToolbar">
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        {selectedId ? (
          <button
            type="button"
            className="btnSoft"
            disabled={scraping || loading}
            onClick={() => void scrapeWebsite()}
          >
            {scraping ? "Scraping…" : "Scrape website metadata"}
          </button>
        ) : null}
      </div>
      {showCreate ? (
        <div className="adminFieldStack" style={{ marginTop: 16, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Manual trusted resource</h3>
          <p className="adminMuted">No EIN lookup required. Assign listing status and publish from this form.</p>
          <label className="fieldLabel">Organization name *</label>
          <input
            className="adminConsoleInput"
            value={createForm.display_name}
            onChange={(e) => setCreateForm((f) => ({ ...f, display_name: e.target.value }))}
          />
          <label className="fieldLabel">Short description</label>
          <textarea
            className="adminConsoleInput"
            rows={3}
            value={createForm.short_description}
            onChange={(e) => setCreateForm((f) => ({ ...f, short_description: e.target.value }))}
          />
          <label className="fieldLabel">Website</label>
          <input
            className="adminConsoleInput"
            value={createForm.website_url}
            onChange={(e) => setCreateForm((f) => ({ ...f, website_url: e.target.value }))}
          />
          <label className="fieldLabel">Logo URL</label>
          <input
            className="adminConsoleInput"
            value={createForm.logo_url}
            onChange={(e) => setCreateForm((f) => ({ ...f, logo_url: e.target.value }))}
          />
          <label className="fieldLabel">Header image URL</label>
          <input
            className="adminConsoleInput"
            value={createForm.header_image_url}
            onChange={(e) => setCreateForm((f) => ({ ...f, header_image_url: e.target.value }))}
          />
          <label className="fieldLabel">Listing status</label>
          <select
            className="adminConsoleInput"
            value={createForm.listing_status}
            onChange={(e) => setCreateForm((f) => ({ ...f, listing_status: e.target.value }))}
          >
            <option value="pending">Pending</option>
            <option value="active">Active (published)</option>
            <option value="archived">Archived</option>
          </select>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={createForm.featured}
              onChange={(e) => setCreateForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            Featured
          </label>
          <button type="button" className="btnPrimary" disabled={creating} onClick={() => void createResource()}>
            Create resource
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}
      {status ? <p style={{ color: "var(--color-success, #166534)" }}>{status}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading && rows.length === 0 ? <p className="adminMuted">No rows.</p> : null}
      {rows.length > 0 ? (
        <div style={{ marginBottom: "12px" }}>
          <label className="fieldLabel" htmlFor="tr-select">
            Resource
          </label>
          <select
            id="tr-select"
            className="adminConsoleInput"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ width: "100%", maxWidth: "560px" }}
          >
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name} ({r.ein}) — {r.listing_status}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {selectedId ? (
        <div className="adminFieldStack">
          {EDIT_KEYS.map((key) => (
            <div key={key}>
              <label className="fieldLabel" htmlFor={`tr-${key}`}>
                {key}
              </label>
              {TEXTAREA_KEYS.has(key) ? (
                <textarea
                  id={`tr-${key}`}
                  className="adminConsoleInput"
                  rows={key === "resource_links" ? 6 : 4}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              ) : (
                <input
                  id={`tr-${key}`}
                  className="adminConsoleInput"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <button type="button" className="btnPrimary" disabled={saving} onClick={() => void save()}>
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}
