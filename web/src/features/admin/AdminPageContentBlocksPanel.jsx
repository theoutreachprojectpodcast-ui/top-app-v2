"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminRichTextEditor from "@/components/admin/AdminRichTextEditor";
import { routeForContentBlock } from "@/lib/admin/pageContentBlocks";

const PAGE_KEYS = [
  "homepage",
  "about",
  "membership",
  "sponsors",
  "community",
  "podcast",
  "trusted",
  "footer",
  "other",
];

export default function AdminPageContentBlocksPanel() {
  const [pageFilter, setPageFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = pageFilter ? `?page_key=${encodeURIComponent(pageFilter)}` : "";
      const res = await fetch(`/api/admin/page-content-blocks${q}`, { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load content blocks.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(body.rows) ? body.rows : []);
    } catch {
      setError("Could not load content blocks.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pageFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBlock(payload, id) {
    setMessage("");
    setError("");
    const url = id ? `/api/admin/page-content-blocks/${id}` : "/api/admin/page-content-blocks";
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Save failed.");
      return false;
    }
    setMessage(id ? "Block updated." : "Block created.");
    setEdit(null);
    await load();
    return true;
  }

  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Page content blocks
      </h1>
      <p className="adminMuted" style={{ lineHeight: 1.55 }}>
        Universal copy store for About, footer, membership landing, and wizard drafts. Published site sections still use
        their dedicated admins — open <strong>Complete in section admin</strong> after approving a block.
      </p>
      <p style={{ marginTop: 12 }}>
        <Link className="btnPrimary" href="/admin/content/create">
          Content wizard
        </Link>
      </p>

      <div className="adminToolbar" style={{ marginTop: 16, gap: 8, flexWrap: "wrap" }}>
        <select className="adminConsoleInput" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)} aria-label="Filter by page">
          <option value="">All pages</option>
          {PAGE_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        <button
          type="button"
          className="btnPrimary"
          onClick={() =>
            setEdit({
              page_key: pageFilter || "about",
              section_key: "main",
              block_type: "copy",
              title: "",
              subtitle: "",
              body_html: "",
              status: "draft",
              display_order: 0,
            })
          }
        >
          New block
        </button>
      </div>

      {error ? <p role="alert" style={{ color: "var(--color-danger, #b42318)", marginTop: 12 }}>{error}</p> : null}
      {message ? <p className="adminMuted" style={{ marginTop: 12 }}>{message}</p> : null}

      {edit ? (
        <BlockEditor
          initial={edit}
          onCancel={() => setEdit(null)}
          onSave={(payload, id) => void saveBlock(payload, id)}
        />
      ) : null}

      {loading ? <p className="adminMuted" style={{ marginTop: 16 }}>Loading…</p> : null}
      <div className="adminPanelBody" style={{ gap: 12, marginTop: 16 }}>
        {rows.map((row) => (
          <article key={row.id} style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>{row.title || "(untitled)"}</strong>
                <div className="adminMuted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  {row.page_key} / {row.section_key} · {row.block_type} · {row.status}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btnSoft" href={row.target_admin_route || routeForContentBlock(row.page_key, row.block_type)}>
                  Section admin
                </Link>
                <button type="button" className="btnSoft" onClick={() => setEdit(row)}>
                  Edit
                </button>
              </div>
            </div>
            <p className="adminMuted" style={{ marginTop: 8, maxHeight: 80, overflow: "hidden" }}>
              {row.body_text || row.body_html?.replace(/<[^>]+>/g, "") || "—"}
            </p>
          </article>
        ))}
      </div>
      {!loading && rows.length === 0 ? (
        <p className="adminMuted" style={{ marginTop: 16 }}>
          No blocks yet. Run <code>page_content_blocks_admin_v10.sql</code> in Supabase if the API errors on missing table.
        </p>
      ) : null}
    </div>
  );
}

function BlockEditor({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({
    page_key: initial.page_key || "about",
    section_key: initial.section_key || "main",
    block_type: initial.block_type || "copy",
    title: initial.title || "",
    subtitle: initial.subtitle || "",
    body_html: initial.body_html || "",
    status: initial.status || "draft",
    display_order: initial.display_order ?? 0,
  });
  const id = initial.id;

  return (
    <div className="adminFieldStack" style={{ marginTop: 20, padding: 16, border: "1px solid var(--color-border-subtle)", borderRadius: 12 }}>
      <h3 style={{ marginTop: 0 }}>{id ? "Edit block" : "New block"}</h3>
      <label className="fieldLabel">Page key</label>
      <select className="adminConsoleInput" value={form.page_key} onChange={(e) => setForm((f) => ({ ...f, page_key: e.target.value }))}>
        {PAGE_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <label className="fieldLabel">Section key</label>
      <input className="adminConsoleInput" value={form.section_key} onChange={(e) => setForm((f) => ({ ...f, section_key: e.target.value }))} />
      <label className="fieldLabel">Title</label>
      <input className="adminConsoleInput" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      <label className="fieldLabel">Body</label>
      <AdminRichTextEditor value={form.body_html} onChange={(html) => setForm((f) => ({ ...f, body_html: html }))} />
      <label className="fieldLabel">Status</label>
      <select className="adminConsoleInput" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="in_review">In review</option>
        <option value="approved">Approved</option>
        <option value="archived">Archived</option>
      </select>
      <div className="adminToolbar">
        <button type="button" className="btnPrimary" onClick={() => void onSave(form, id)}>
          Save
        </button>
        <button type="button" className="btnSoft" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
