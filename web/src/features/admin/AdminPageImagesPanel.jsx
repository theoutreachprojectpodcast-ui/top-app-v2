"use client";

import { useCallback, useEffect, useState } from "react";

const BLANK_FORM = {
  page_key: "",
  section_key: "default",
  image_kind: "hero",
  image_url: "",
  alt_text: "",
  is_active: true,
  display_order: 0,
};

export default function AdminPageImagesPanel() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/page-images", { credentials: "include" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Could not load images.");
      setRows([]);
    } else {
      setRows(Array.isArray(body.rows) ? body.rows : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addImage() {
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/page-images", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Create failed.");
      return;
    }
    setForm(BLANK_FORM);
    setMessage("Image record created.");
    void load();
  }

  async function updateRow(id, patch) {
    const res = await fetch(`/api/admin/page-images/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) void load();
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Page image manager</h2>
      <p className="adminMuted">Manage page/section images that can be consumed by public routes.</p>
      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--color-success, #166534)" }}>{message}</p> : null}

      <div className="adminFieldStack">
        {[
          ["page_key", "Page key"],
          ["section_key", "Section key"],
          ["image_url", "Image URL"],
          ["alt_text", "Alt text"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="fieldLabel" htmlFor={`pi-${key}`}>{label}</label>
            <input
              id={`pi-${key}`}
              className="adminConsoleInput"
              value={String(form[key] || "")}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className="fieldLabel" htmlFor="pi-kind">Image kind</label>
          <select id="pi-kind" className="adminConsoleInput" value={form.image_kind} onChange={(e) => setForm((prev) => ({ ...prev, image_kind: e.target.value }))}>
            {["background", "hero", "section", "card_fallback", "logo", "other"].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <button type="button" className="btnPrimary" onClick={() => void addImage()}>Create image record</button>
      </div>

      <hr className="adminRule" style={{ margin: "16px 0" }} />
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead><tr><th>Page</th><th>Section</th><th>Kind</th><th>URL</th><th>Active</th><th>Order</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Page">{row.page_key}</td>
                <td data-label="Section">{row.section_key}</td>
                <td data-label="Kind">{row.image_kind}</td>
                <td data-label="URL">{row.image_url}</td>
                <td data-label="Active">
                  <select className="adminConsoleInput" value={row.is_active ? "true" : "false"} onChange={(e) => updateRow(row.id, { is_active: e.target.value === "true" })}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </td>
                <td data-label="Order">
                  <input className="adminConsoleInput" defaultValue={String(row.display_order || 0)} onBlur={(e) => updateRow(row.id, { display_order: Number.parseInt(e.target.value || "0", 10) || 0 })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
