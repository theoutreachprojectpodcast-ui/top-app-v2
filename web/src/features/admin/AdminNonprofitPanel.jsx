"use client";

import { useState } from "react";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

const FIELDS = [
  ["headline", "Headline"],
  ["tagline", "Tagline"],
  ["short_description", "Short description"],
  ["website_url", "Website URL"],
  ["logo_url", "Logo URL"],
  ["hero_image_url", "Hero image URL"],
  ["thumbnail_url", "Thumbnail URL"],
  ["header_image_url", "Header image URL"],
  ["facebook_url", "Facebook"],
  ["instagram_url", "Instagram"],
  ["linkedin_url", "LinkedIn"],
  ["x_url", "X / Twitter"],
  ["youtube_url", "YouTube"],
  ["tiktok_url", "TikTok"],
];

export default function AdminNonprofitPanel() {
  const [einInput, setEinInput] = useState("");
  const [ein, setEin] = useState("");
  const [directory, setDirectory] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const e = normalizeEinDigits(einInput);
    if (e.length !== 9) {
      setError("Enter a valid 9-digit EIN.");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/directory/${encodeURIComponent(e)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Load failed.");
        return;
      }
      setEin(data.ein || e);
      setDirectory(data.directory);
      const en = data.enrichment || {};
      const next = {};
      for (const [k] of FIELDS) {
        next[k] = en[k] != null ? String(en[k]) : "";
      }
      setForm(next);
    } catch {
      setError("Load failed.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!ein) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/directory/${encodeURIComponent(ein)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      setStatus("Saved.");
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Directory nonprofit</h2>
      <p className="adminMuted">Loads canonical directory row + enrichment (`nonprofit_directory_enrichment`). Saves upsert by EIN.</p>
      <div className="adminToolbar">
        <label className="fieldLabel" htmlFor="ein-q">
          EIN
        </label>
        <input
          id="ein-q"
          className="adminConsoleInput"
          value={einInput}
          onChange={(e) => setEinInput(e.target.value)}
          placeholder="12-3456789"
        />
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Load
        </button>
      </div>
      {directory ? (
        <p className="adminMuted" style={{ marginBottom: "12px" }}>
          Directory name:{" "}
          <strong>
            {String(directory.org_name || directory.name || directory.NAME || directory.organization_name || "—")}
          </strong>
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}
      {status ? <p style={{ color: "var(--color-success, #166534)" }}>{status}</p> : null}
      {ein ? (
        <div className="adminFieldStack">
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="fieldLabel" htmlFor={`nf-${key}`}>
                {label}
              </label>
              <input
                id={`nf-${key}`}
                className="adminConsoleInput"
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button type="button" className="btnPrimary" disabled={saving} onClick={() => void save()}>
            Save enrichment
          </button>
        </div>
      ) : null}
    </div>
  );
}
