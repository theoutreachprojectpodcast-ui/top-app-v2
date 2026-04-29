"use client";

import { useCallback, useEffect, useState } from "react";

function emptyForm() {
  return {
    id: "",
    name: "",
    organization: "",
    role_title: "",
    short_description: "",
    profile_image_url: "",
    expected_episode_date: "",
    status: "draft",
    sort_order: 0,
  };
}

export default function PodcastUpcomingGuestsAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/podcasts/upcoming-guests", { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.rows)) {
        setRows(body.rows);
      } else {
        setMsg(body.error || "Could not load upcoming guests.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveReorder(nextRows) {
    const ids = nextRows.map((r) => r.id);
    const res = await fetch("/api/admin/podcasts/upcoming-guests", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: true, ids }),
    });
    if (res.ok) {
      setRows(nextRows);
      setMsg("Order updated.");
    }
  }

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    const t = next[idx];
    next[idx] = next[j];
    next[j] = t;
    void saveReorder(next);
  }

  function editRow(r) {
    setForm({
      id: r.id,
      name: r.name || "",
      organization: r.organization || "",
      role_title: r.role_title || "",
      short_description: r.short_description || "",
      profile_image_url: r.profile_image_url || "",
      expected_episode_date: r.expected_episode_date ? String(r.expected_episode_date).slice(0, 10) : "",
      status: r.status === "published" ? "published" : "draft",
      sort_order: Number(r.sort_order) || 0,
    });
    setMsg("");
  }

  async function submitCreateOrUpdate() {
    setMsg("");
    const payload = {
      name: form.name.trim(),
      organization: form.organization.trim(),
      role_title: form.role_title.trim(),
      short_description: form.short_description.trim(),
      profile_image_url: form.profile_image_url.trim(),
      expected_episode_date: form.expected_episode_date || null,
      status: form.status,
      sort_order: Number(form.sort_order) || 0,
    };
    if (!payload.name) {
      setMsg("Name is required.");
      return;
    }
    if (form.id) {
      const res = await fetch("/api/admin/podcasts/upcoming-guests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body.error || "Update failed.");
        return;
      }
      setMsg("Updated.");
    } else {
      const res = await fetch("/api/admin/podcasts/upcoming-guests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body.error || "Create failed.");
        return;
      }
      setMsg("Created.");
    }
    setForm(emptyForm());
    await load();
  }

  async function remove(id) {
    if (!id || !window.confirm("Delete this upcoming guest?")) return;
    const res = await fetch(`/api/admin/podcasts/upcoming-guests?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setMsg("Deleted.");
      if (form.id === id) setForm(emptyForm());
      await load();
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p className="adminMuted">
        Published rows appear on the podcast page &ldquo;Upcoming Guests&rdquo; section. Drafts stay admin-only.
      </p>
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btnSoft" disabled={loading} onClick={() => void load()}>
          Reload
        </button>
        <button type="button" className="btnSoft" onClick={() => setForm(emptyForm())}>
          Clear form (new)
        </button>
      </div>
      {msg ? <p className="adminMuted">{msg}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th align="left">Order</th>
              <th align="left">Status</th>
              <th align="left">Name</th>
              <th align="left">Org</th>
              <th align="left">Expected</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  <button type="button" className="btnSoft" disabled={idx === 0} onClick={() => move(idx, -1)}>
                    ↑
                  </button>{" "}
                  <button type="button" className="btnSoft" disabled={idx === rows.length - 1} onClick={() => move(idx, 1)}>
                    ↓
                  </button>
                </td>
                <td style={{ padding: "6px 8px" }}>{r.status}</td>
                <td style={{ padding: "6px 8px" }}>{r.name}</td>
                <td style={{ padding: "6px 8px" }}>{r.organization}</td>
                <td style={{ padding: "6px 8px" }}>{r.expected_episode_date || "—"}</td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  <button type="button" className="btnSoft" onClick={() => editRow(r)}>
                    Edit
                  </button>{" "}
                  <button type="button" className="btnSoft" onClick={() => void remove(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>{form.id ? "Edit upcoming guest" : "Add upcoming guest"}</h3>
        <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
          <label className="fieldLabel">
            Name *
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label className="fieldLabel">
            Organization
            <input
              className="input"
              value={form.organization}
              onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label className="fieldLabel">
            Title / role
            <input
              className="input"
              value={form.role_title}
              onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label className="fieldLabel">
            Short description
            <textarea
              className="input"
              rows={3}
              value={form.short_description}
              onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label className="fieldLabel">
            Profile image URL
            <input
              className="input"
              value={form.profile_image_url}
              onChange={(e) => setForm((f) => ({ ...f, profile_image_url: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label className="fieldLabel">
            Expected episode date
            <input
              className="input"
              type="date"
              value={form.expected_episode_date}
              onChange={(e) => setForm((f) => ({ ...f, expected_episode_date: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label className="fieldLabel">
            Status
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
          <label className="fieldLabel">
            Sort order (manual; use arrows in table for visual order)
            <input
              className="input"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <button type="button" className="btnPrimary" onClick={() => void submitCreateOrUpdate()}>
            {form.id ? "Save changes" : "Add guest"}
          </button>
        </div>
      </div>
    </div>
  );
}
