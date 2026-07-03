"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminPanelShell from "@/components/admin/AdminPanelShell";

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
    <AdminPanelShell panelId="homepage" nested error={error} message={status}>
      {loading ? <p className="adminMuted">Loading…</p> : null}
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
          <h3 className="adminBlockTitle adminMt4">Live preview (published Mission Partners)</h3>
          {preview.length === 0 ? (
            <p className="adminMuted">No homepage featured sponsors in the database. Mark Mission Partners as featured in Sponsors admin.</p>
          ) : (
            <ol className="adminListPlain">
              {preview.map((s) => (
                <li key={s.slug || s.id}>
                  {s.name} <span className="adminMuted">({s.slug || s.id})</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
      <p className="adminMuted adminMuted--sm">
        Manage sponsor rows in <Link href="/admin/sponsors">Sponsors</Link>.
      </p>
    </AdminPanelShell>
  );
}
