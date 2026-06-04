"use client";

import { useCallback, useEffect, useState } from "react";

const POST_TYPES = [
  { value: "admin_update", label: "Admin update / blog" },
  { value: "share_story", label: "General story" },
  { value: "step_by_step", label: "Step-by-step" },
  { value: "carousel", label: "Carousel (image URL in photo_url)" },
  { value: "video_link", label: "Video / podcast link" },
];

const SCOPES = [
  { id: "pending", label: "Pending review" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "rejected", label: "Rejected" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "all", label: "All" },
];

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending_review") return "Pending review";
  if (s === "approved") return "Published";
  if (s === "rejected") return "Rejected";
  if (s === "hidden") return "Hidden";
  if (s === "draft") return "Draft";
  return status || "Unknown";
}

export default function AdminCommunityPostsSection() {
  const [scope, setScope] = useState("pending");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    post_type: "admin_update",
    category: "admin_update",
    link_url: "",
    photo_url: "",
    author_name: "The Outreach Project",
    publish: false,
    featured: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/community/posts?scope=${encodeURIComponent(scope)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load posts.");
        setPosts([]);
        return;
      }
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setError("Could not load posts.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id, action, extra = {}) {
    setBusy(id + action);
    setError("");
    setStatusMsg("");
    try {
      const res = await fetch(`/api/admin/community/posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Action failed.");
        return;
      }
      if (action === "approve") setStatusMsg("Post approved and published to the community feed.");
      else if (action === "reject") setStatusMsg("Post rejected.");
      else if (action === "publish") setStatusMsg("Post published.");
      setEditId("");
      await load();
    } catch {
      setError("Action failed.");
    } finally {
      setBusy("");
    }
  }

  function rejectWithReason(id) {
    const reason = window.prompt(
      "Rejection reason (shown to moderators; optional note for internal use):",
      "Does not meet community guidelines.",
    );
    if (reason === null) return;
    void act(id, "reject", { rejectionReason: reason });
  }

  async function saveEdit(id) {
    await act(id, "edit", { title: editTitle, body: editBody });
  }

  async function createPost() {
    setBusy("create");
    setError("");
    setStatusMsg("");
    try {
      const res = await fetch("/api/admin/community/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Create failed.");
        return;
      }
      setDraft((d) => ({ ...d, title: "", body: "", photo_url: "", link_url: "" }));
      setShowCreate(false);
      setStatusMsg(draft.publish ? "Staff post created and published." : "Staff post saved as draft.");
      if (!draft.publish) setScope("draft");
      await load();
    } catch {
      setError("Create failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Community posts & moderation
      </h1>
      <p className="adminMuted" style={{ lineHeight: 1.55 }}>
        Member stories submit as <strong>pending review</strong> and only appear on the public community page after
        approval. Staff posts can be drafted or published directly. All changes persist to <code>community_posts</code>.
      </p>

      <div className="adminToolbar" style={{ gap: 8, flexWrap: "wrap" }}>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={scope === s.id ? "btnPrimary" : "btnSoft"}
            onClick={() => setScope(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        <button type="button" className="btnSoft" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Close create form" : "New staff post"}
        </button>
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)", marginTop: 12 }}>
          {error}
        </p>
      ) : null}
      {statusMsg ? <p className="adminMuted" style={{ marginTop: 12 }}>{statusMsg}</p> : null}

      {showCreate ? (
        <div className="adminFieldStack" style={{ marginTop: 16, padding: 16, border: "1px solid var(--color-border-subtle)", borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>Create staff post</h3>
          <label className="fieldLabel">Title</label>
          <input className="adminConsoleInput" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <label className="fieldLabel">Body</label>
          <textarea className="adminConsoleInput" rows={5} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
          <label className="fieldLabel">Post type</label>
          <select className="adminConsoleInput" value={draft.post_type} onChange={(e) => setDraft((d) => ({ ...d, post_type: e.target.value }))}>
            {POST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="fieldLabel">Image URL (optional)</label>
          <input className="adminConsoleInput" value={draft.photo_url} onChange={(e) => setDraft((d) => ({ ...d, photo_url: e.target.value }))} />
          <label className="fieldLabel">Link URL (video / CTA)</label>
          <input className="adminConsoleInput" value={draft.link_url} onChange={(e) => setDraft((d) => ({ ...d, link_url: e.target.value }))} />
          <label className="fieldLabel">
            <input type="checkbox" checked={draft.publish} onChange={(e) => setDraft((d) => ({ ...d, publish: e.target.checked }))} /> Publish immediately (skip review queue)
          </label>
          <button type="button" className="btnPrimary" disabled={busy === "create"} onClick={() => void createPost()}>
            Create post
          </button>
        </div>
      ) : null}

      <h2 style={{ marginTop: 24, fontSize: "1.1rem" }}>
        {SCOPES.find((s) => s.id === scope)?.label || "Posts"}
        {!loading ? ` (${posts.length})` : ""}
      </h2>

      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading && posts.length === 0 ? (
        <p className="adminMuted">
          {scope === "pending"
            ? "No posts awaiting review. Member submissions will appear here."
            : "No posts in this view."}
        </p>
      ) : null}

      <div className="adminPanelBody" style={{ gap: 16, marginTop: 12 }}>
        {posts.map((p) => {
          const st = String(p.status || "").toLowerCase();
          const isPending = st === "pending_review";
          const isPublished = st === "approved";
          return (
            <article
              key={p.id}
              style={{
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-lg, 12px)",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{p.title || "(no title)"}</strong>
                  <div className="adminMuted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    {statusLabel(p.status)}
                    {p.author_name ? ` · ${p.author_name}` : ""}
                    {p.post_type ? ` · ${p.post_type}` : ""}
                    {p.admin_bookmark ? " · bookmarked" : ""}
                  </div>
                </div>
                <div className="adminActionCell" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {isPending ? (
                    <>
                      <button type="button" className="btnPrimary" disabled={!!busy} onClick={() => void act(p.id, "approve")}>
                        Approve
                      </button>
                      <button type="button" className="btnSoft" disabled={!!busy} onClick={() => rejectWithReason(p.id)}>
                        Reject
                      </button>
                    </>
                  ) : null}
                  {!isPublished && !isPending ? (
                    <button type="button" className="btnPrimary" disabled={!!busy} onClick={() => void act(p.id, "publish")}>
                      Publish
                    </button>
                  ) : null}
                  {isPublished ? (
                    <button type="button" className="btnSoft" disabled={!!busy} onClick={() => void act(p.id, "unpublish")}>
                      Unpublish
                    </button>
                  ) : null}
                  <button type="button" className="btnSoft" disabled={!!busy} onClick={() => void act(p.id, "hide")}>
                    Hide
                  </button>
                  <button
                    type="button"
                    className="btnSoft"
                    disabled={!!busy}
                    onClick={() =>
                      void act(p.id, p.admin_bookmark ? "unbookmark" : "bookmark", p.admin_bookmark ? {} : { note: "" })
                    }
                  >
                    {p.admin_bookmark ? "Unbookmark" : "Bookmark"}
                  </button>
                  <button
                    type="button"
                    className="btnSoft"
                    onClick={() => {
                      setEditId(p.id);
                      setEditTitle(String(p.title || ""));
                      setEditBody(String(p.body || ""));
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btnSoft" disabled={!!busy} onClick={() => void act(p.id, "delete")}>
                    Delete
                  </button>
                </div>
              </div>
              <p style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 200, overflow: "auto" }}>
                {p.body}
              </p>
              {p.rejection_reason ? (
                <p className="adminMuted" style={{ fontSize: "0.85rem" }}>
                  Rejection: {p.rejection_reason}
                </p>
              ) : null}
              {editId === p.id ? (
                <div className="adminFieldStack" style={{ marginTop: 12 }}>
                  <label className="fieldLabel" htmlFor={`edit-t-${p.id}`}>
                    Title
                  </label>
                  <input
                    id={`edit-t-${p.id}`}
                    className="adminConsoleInput"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <label className="fieldLabel" htmlFor={`edit-b-${p.id}`}>
                    Body
                  </label>
                  <textarea
                    id={`edit-b-${p.id}`}
                    className="adminConsoleInput"
                    rows={6}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  <div className="adminToolbar">
                    <button type="button" className="btnPrimary" disabled={!!busy} onClick={() => void saveEdit(p.id)}>
                      Save edit
                    </button>
                    <button type="button" className="btnSoft" onClick={() => setEditId("")}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
