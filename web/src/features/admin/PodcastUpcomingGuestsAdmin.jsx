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
    episode_topic: "",
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
    const st = String(r.status || "draft").toLowerCase();
    const allowed = new Set(["draft", "scheduled", "confirmed", "published", "hidden"]);
    setForm({
      id: r.id,
      name: r.name || "",
      organization: r.organization || "",
      role_title: r.role_title || "",
      short_description: r.short_description || "",
      profile_image_url: r.profile_image_url || "",
      expected_episode_date: r.expected_episode_date ? String(r.expected_episode_date).slice(0, 10) : "",
      episode_topic: r.episode_topic || "",
      status: allowed.has(st) ? st : "draft",
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
      episode_topic: form.episode_topic.trim(),
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
    <div className="adminPageStack">
      <p className="adminLead">
        Rows in <strong>scheduled</strong>, <strong>confirmed</strong>, or <strong>published</strong> appear on the public podcast page.
        <strong> Draft</strong> and <strong>hidden</strong> stay admin-only. Apply DB migration{" "}
        <code>podcast_upcoming_guests_v09_status_topic.sql</code> if status updates fail.
      </p>
      <div className="adminRow">
        <button type="button" className="btnSoft" disabled={loading} onClick={() => void load()}>
          Reload
        </button>
        <button type="button" className="btnSoft" onClick={() => setForm(emptyForm())}>
          Clear form (new)
        </button>
      </div>
      {msg ? <p className="adminMuted">{msg}</p> : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th align="left">Order</th>
              <th align="left">Status</th>
              <th align="left">Name</th>
              <th align="left">Org</th>
              <th align="left">Topic</th>
              <th align="left">Expected</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td className="adminTable__cell--nowrap">
                  <button type="button" className="btnSoft" disabled={idx === 0} onClick={() => move(idx, -1)}>
                    ↑
                  </button>{" "}
                  <button type="button" className="btnSoft" disabled={idx === rows.length - 1} onClick={() => move(idx, 1)}>
                    ↓
                  </button>
                </td>
                <td>{r.status}</td>
                <td>{r.name}</td>
                <td>{r.organization}</td>
                <td className="adminTable__cell--clamp" title={r.episode_topic || ""}>
                  {r.episode_topic ? `${String(r.episode_topic).slice(0, 48)}${String(r.episode_topic).length > 48 ? "…" : ""}` : "—"}
                </td>
                <td>{r.expected_episode_date || "—"}</td>
                <td className="adminTable__cell--nowrap">
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

      <div className="adminDividerSection">
        <h3 className="adminSubheading adminSubheading--sm">{form.id ? "Edit upcoming guest" : "Add upcoming guest"}</h3>
        <div className="adminFieldStack adminFieldStack--wide">
          <label className="fieldLabel">
            Name *
            <input className="adminConsoleInput" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="fieldLabel">
            Organization
            <input
              className="adminConsoleInput"
              value={form.organization}
              onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Title / role
            <input
              className="adminConsoleInput"
              value={form.role_title}
              onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Short description
            <textarea
              className="adminConsoleInput"
              rows={3}
              value={form.short_description}
              onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Profile image URL
            <input
              className="adminConsoleInput"
              value={form.profile_image_url}
              onChange={(e) => setForm((f) => ({ ...f, profile_image_url: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Episode / topic (optional)
            <input
              className="adminConsoleInput"
              value={form.episode_topic}
              onChange={(e) => setForm((f) => ({ ...f, episode_topic: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Expected episode date
            <input
              className="adminConsoleInput"
              type="date"
              value={form.expected_episode_date}
              onChange={(e) => setForm((f) => ({ ...f, expected_episode_date: e.target.value }))}
            />
          </label>
          <label className="fieldLabel">
            Status
            <select
              className="adminConsoleInput"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <label className="fieldLabel">
            Sort order (manual; use arrows in table for visual order)
            <input
              className="adminConsoleInput"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
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
