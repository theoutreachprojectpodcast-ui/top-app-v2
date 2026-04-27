"use client";

import { useCallback, useEffect, useState } from "react";

const EDIT_KEYS = [
  "display_name",
  "website_url",
  "logo_url",
  "header_image_url",
  "short_description",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "x_url",
  "linkedin_url",
  "listing_status",
  "sort_order",
];

function hydrateForm(row) {
  const next = {};
  for (const k of EDIT_KEYS) {
    if (k === "sort_order") next[k] = row[k] != null ? String(row[k]) : "0";
    else next[k] = row[k] != null ? String(row[k]) : "";
  }
  return next;
}

export default function AdminTrustedPanel() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Trusted resources</h2>
      <p className="adminMuted">Edits `trusted_resources` (service role). Public listing still respects RLS for anon/authenticated clients.</p>
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
              {key === "short_description" ? (
                <textarea
                  id={`tr-${key}`}
                  className="adminConsoleInput"
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
