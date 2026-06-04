"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHomepagePanel() {
  const [settings, setSettings] = useState({ carouselLimit: 3, carouselIntervalMs: 3000 });
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/homepage", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load homepage settings.");
        return;
      }
      setSettings(data.settings || { carouselLimit: 3, carouselIntervalMs: 3000 });
      const prev = data.preview;
      setPreview(Array.isArray(prev?.sponsors) ? prev.sponsors : Array.isArray(prev) ? prev : []);
    } catch {
      setError("Could not load homepage settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/settings/homepage", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      setSettings(data.settings);
      setPreview(Array.isArray(data.preview?.sponsors) ? data.preview.sponsors : []);
      setStatus("Saved.");
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adminPanel adminPanel--nested">
      <h3 style={{ marginTop: 0 }}>Homepage — Mission Partners carousel</h3>
      <p className="adminMuted">
        Public home shows sponsors where <strong>mission_partner</strong> and <strong>featured</strong> are true and status is
        active. Manage rows in <Link href="/admin/sponsors">Sponsors</Link>.
      </p>
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {status ? <p style={{ color: "var(--color-success, #166534)" }}>{status}</p> : null}
      {!loading ? (
        <>
          <div className="adminFieldStack">
            <label className="fieldLabel" htmlFor="hp-limit">
              Carousel item count (max shown)
            </label>
            <input
              id="hp-limit"
              className="adminConsoleInput"
              type="number"
              min={1}
              max={12}
              value={settings.carouselLimit}
              onChange={(e) => setSettings((s) => ({ ...s, carouselLimit: Number(e.target.value) }))}
            />
            <label className="fieldLabel" htmlFor="hp-interval">
              Mobile carousel interval (ms)
            </label>
            <input
              id="hp-interval"
              className="adminConsoleInput"
              type="number"
              min={2000}
              max={15000}
              step={500}
              value={settings.carouselIntervalMs}
              onChange={(e) => setSettings((s) => ({ ...s, carouselIntervalMs: Number(e.target.value) }))}
            />
            <button type="button" className="btnPrimary" disabled={saving} onClick={() => void save()}>
              Save homepage settings
            </button>
          </div>
          <h4>Live preview (published Mission Partners)</h4>
          {preview.length === 0 ? (
            <p className="adminMuted">No homepage featured sponsors in the database. Mark Mission Partners as featured in Sponsors admin.</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {preview.map((s) => (
                <li key={s.slug || s.id}>
                  {s.name} <span className="adminMuted">({s.slug || s.id})</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </div>
  );
}
