"use client";

import { useCallback, useEffect, useState } from "react";
import SponsorAdminReviewSection from "@/features/sponsors/components/SponsorAdminReviewSection";
import SponsorLogoReviewPanel from "@/features/sponsors/admin/SponsorLogoReviewPanel";

const EDIT_KEYS = [
  "name",
  "sponsor_type",
  "website_url",
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
];

function hydrateForm(row) {
  const next = {};
  for (const k of EDIT_KEYS) {
    if (k === "featured" || k === "verified") {
      next[k] = row[k] ? "true" : "false";
    } else if (k === "display_order") {
      next[k] = row[k] != null ? String(row[k]) : "0";
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
        if (k === "featured" || k === "verified") {
          body[k] = v === "true";
        } else if (k === "display_order") {
          body[k] = parseInt(String(v), 10) || 0;
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

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Sponsors</h2>
      <p className="adminMuted">Edits `sponsors_catalog`.</p>
      <div className="adminToolbar">
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}
      {status ? <p style={{ color: "var(--color-success, #166534)" }}>{status}</p> : null}
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
        <div style={{ display: "grid", gap: "10px", maxWidth: "720px" }}>
          {EDIT_KEYS.map((key) => (
            <div key={key}>
              <label className="fieldLabel" htmlFor={`sp-${key}`}>
                {key}
              </label>
              {key === "short_description" || key === "long_description" ? (
                <textarea
                  id={`sp-${key}`}
                  className="adminConsoleInput"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              ) : key === "featured" || key === "verified" ? (
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
          <button type="button" className="btnPrimary" disabled={saving} onClick={() => void save()}>
            Save
          </button>
        </div>
      ) : null}
      <hr className="adminRule" style={{ margin: "16px 0" }} />
      <SponsorAdminReviewSection showAdmin supabase={null} />
      <SponsorLogoReviewPanel showAdmin onChanged={() => void load()} />
    </div>
  );
}
