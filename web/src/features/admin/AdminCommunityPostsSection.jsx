"use client";

import { useCallback, useEffect, useState } from "react";
import AdminRichTextEditor from "@/components/admin/AdminRichTextEditor";
import AdminMediaUploadField from "@/components/admin/AdminMediaUploadField";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import { isLikelyHtml, sanitizeAdminHtml } from "@/lib/admin/sanitizeHtml";

const POST_TYPES = [
  { value: "admin_update", label: "Admin update / blog" },
  { value: "share_story", label: "General story" },
  { value: "step_by_step", label: "Step-by-step" },
  { value: "carousel", label: "Carousel (image URL in photo_url)" },
  { value: "video_link", label: "Video / podcast link" },
];

const SCOPES = [
  { id: "pending", label: "Moderation queue" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "rejected", label: "Denied" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "all", label: "All" },
];

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending_review") return "Pending review";
  if (s === "submitted") return "Submitted";
  if (s === "under_review" || s === "in_review") return "In review";
  if (s === "approved") return "Published";
  if (s === "rejected") return "Denied";
  if (s === "hidden" || s === "archived") return "Archived";
  if (s === "draft") return "Draft";
  return status || "Unknown";
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
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
    <AdminPanelShell panelId="community" error={error} message={statusMsg}>
      <div className="adminToolbar">
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

      {showCreate ? (
        <div className="adminFieldStack adminFieldStack--bordered">
          <h3 className="adminBlockTitle">Create staff post</h3>
          <label className="fieldLabel">Title</label>
          <input className="adminConsoleInput" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <label className="fieldLabel">Body</label>
          <AdminRichTextEditor value={draft.body} onChange={(html) => setDraft((d) => ({ ...d, body: html }))} />
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

      <h2 className="adminSectionTitle">
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

      <div className="adminPanelBody adminPanelBody--loose">
        {posts.map((p) => {
          const st = String(p.status || "").toLowerCase();
          const isPending = ["pending_review", "submitted", "under_review", "in_review"].includes(st);
          const isPublished = st === "approved";
          return (
            <article key={p.id} className="adminEntityCard">
              <div className="adminEntityCard__header">
                <div>
                  <strong>{p.title || "(no title)"}</strong>
                  <div className="adminMuted adminEntityCard__meta">
                    {statusLabel(p.status)}
                    {p.author_name ? ` · ${p.author_name}` : ""}
                    {p.post_type ? ` · ${p.post_type}` : ""}
                    {p.admin_bookmark ? " · bookmarked" : ""}
                  </div>
                  <div className="adminPostMeta">
                    <span>Submitted: {formatWhen(p.created_at)}</span>
                    {p.author_profile_id ? <span>Profile id: {String(p.author_profile_id).slice(0, 8)}…</span> : null}
                    {p.author_id ? <span>Author id: {String(p.author_id).slice(0, 12)}…</span> : null}
                    {p.link_url ? (
                      <span>
                        Link:{" "}
                        <a href={p.link_url} target="_blank" rel="noopener noreferrer">
                          {p.link_url}
                        </a>
                      </span>
                    ) : null}
                    {p.moderation_notes ? <span>Notes: {p.moderation_notes}</span> : null}
                  </div>
                </div>
                <div className="adminEntityCard__actions">
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
              {isLikelyHtml(p.body) ? (
                <div
                  className="communityPostBody communityPostBody--rich adminEntityCard__body"
                  dangerouslySetInnerHTML={{ __html: sanitizeAdminHtml(p.body) }}
                />
              ) : (
                <p className="adminEntityCard__body adminEntityCard__body--pre">
                  {p.body}
                </p>
              )}
              {p.rejection_reason ? (
                <p className="adminMuted adminMuted--sm adminMt4">
                  Rejection: {p.rejection_reason}
                </p>
              ) : null}
              {editId === p.id ? (
                <div className="adminFieldStack adminMt4">
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
                  <AdminRichTextEditor value={editBody} onChange={setEditBody} minHeight={120} />
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
    </AdminPanelShell>
  );
}
