"use client";

import { useCallback, useEffect, useState } from "react";
import AdminRichTextEditor from "@/components/admin/AdminRichTextEditor";
import AdminMediaUploadField from "@/components/admin/AdminMediaUploadField";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import { isLikelyHtml, sanitizeAdminHtml } from "@/lib/admin/sanitizeHtml";

const POST_TYPES = [
  { value: "admin_update", label: "Text post" },
  { value: "platform_guide_image", label: "Image post" },
  { value: "platform_guide_carousel", label: "Carousel post" },
  { value: "video_link", label: "Video link post" },
  { value: "platform_guide_resource", label: "Resource link post" },
  { value: "platform_guide_podcast", label: "Podcast post" },
];

const SCOPES = [
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "pending", label: "Moderation queue" },
  { id: "rejected", label: "Denied" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "all", label: "All" },
];

const EMPTY_DRAFT = {
  title: "",
  body: "",
  post_type: "admin_update",
  category: "admin_update",
  photo_url: "",
  carousel_images: [],
  video_url: "",
  podcast_url: "",
  resource_url: "",
  cta_label: "",
  cta_url: "",
  tags: "",
  author_name: "The Outreach Project",
  publish: false,
  featured: false,
  is_pinned: false,
  comments_enabled: true,
};

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending_review") return "Pending review";
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

function AdminPostComments({ postId }) {
  const [comments, setComments] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/community/posts/${encodeURIComponent(postId)}/comments`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  async function modComment(commentId, action) {
    await fetch(
      `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    await loadComments();
  }

  return (
    <div className="adminMt4">
      <button
        type="button"
        className="btnSoft"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void loadComments();
        }}
      >
        {open ? "Hide comments" : "Moderate comments"}
      </button>
      {open ? (
        <div className="adminFieldStack adminMt4">
          {loading ? <p className="adminMuted">Loading comments…</p> : null}
          {!loading && comments.length === 0 ? <p className="adminMuted">No comments on this post.</p> : null}
          {comments.map((c) => {
            const prof = c.top_profiles && typeof c.top_profiles === "object" ? c.top_profiles : {};
            const name =
              [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim() ||
              String(prof.display_name || "Member");
            return (
              <div key={c.id} className="adminEntityCard adminEntityCard--compact">
                <div className="adminMuted adminEntityCard__meta">
                  {name} · {statusLabel(c.status)} · {formatWhen(c.created_at)}
                </div>
                <p className="adminEntityCard__body--pre">{c.body}</p>
                {c.status === "published" ? (
                  <div className="adminToolbar">
                    <button type="button" className="btnSoft" onClick={() => void modComment(c.id, "hide")}>
                      Hide
                    </button>
                    <button type="button" className="btnSoft" onClick={() => void modComment(c.id, "delete")}>
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminCommunityPostsSection() {
  const [scope, setScope] = useState("published");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });

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
      if (action === "approve" || action === "publish") setStatusMsg("Post published to the community feed.");
      else if (action === "reject") setStatusMsg("Post rejected.");
      else if (action === "unpublish") setStatusMsg("Post unpublished.");
      setEditId("");
      setEditDraft(null);
      await load();
    } catch {
      setError("Action failed.");
    } finally {
      setBusy("");
    }
  }

  function rejectWithReason(id) {
    const reason = window.prompt("Rejection reason:", "Does not meet community guidelines.");
    if (reason === null) return;
    void act(id, "reject", { rejectionReason: reason });
  }

  function openEdit(post) {
    const slides = post.feed_media_json?.slides;
    const carouselImages = Array.isArray(slides)
      ? slides.map((s) => (typeof s === "string" ? s : s?.src || "")).filter(Boolean)
      : [];
    setEditId(post.id);
    setEditDraft({
      title: String(post.title || ""),
      body: String(post.body || ""),
      post_type: String(post.post_type || "admin_update"),
      photo_url: String(post.photo_url || ""),
      carousel_images: carouselImages,
      video_url: String(post.video_url || ""),
      podcast_url: String(post.podcast_url || ""),
      resource_url: String(post.resource_url || ""),
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      is_pinned: !!post.is_pinned,
      comments_enabled: post.comments_enabled !== false,
      featured: !!post.featured,
    });
  }

  async function saveEdit(id) {
    if (!editDraft) return;
    await act(id, "edit", {
      title: editDraft.title,
      body: editDraft.body,
      post_type: editDraft.post_type,
      photo_url: editDraft.photo_url,
      carousel_images: editDraft.carousel_images,
      video_url: editDraft.video_url,
      podcast_url: editDraft.podcast_url,
      resource_url: editDraft.resource_url,
      tags: editDraft.tags,
      is_pinned: editDraft.is_pinned,
      comments_enabled: editDraft.comments_enabled,
      featured: editDraft.featured,
    });
  }

  async function createPost() {
    setBusy("create");
    setError("");
    setStatusMsg("");
    const publish = draft.publish;
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
      setDraft({ ...EMPTY_DRAFT });
      setShowCreate(false);
      setShowPreview(false);
      setStatusMsg(publish ? "Post created and published." : "Post saved as draft.");
      setScope(publish ? "published" : "draft");
      await load();
    } catch {
      setError("Create failed.");
    } finally {
      setBusy("");
    }
  }

  function renderPostBuilderForm(state, setState, idPrefix = "create") {
    return (
      <>
        <label className="fieldLabel" htmlFor={`${idPrefix}-title`}>
          Title
        </label>
        <input
          id={`${idPrefix}-title`}
          className="adminConsoleInput"
          value={state.title}
          onChange={(e) => setState((d) => ({ ...d, title: e.target.value }))}
        />
        <label className="fieldLabel">Body</label>
        <AdminRichTextEditor value={state.body} onChange={(html) => setState((d) => ({ ...d, body: html }))} />
        <label className="fieldLabel" htmlFor={`${idPrefix}-type`}>
          Post format
        </label>
        <select
          id={`${idPrefix}-type`}
          className="adminConsoleInput"
          value={state.post_type}
          onChange={(e) => setState((d) => ({ ...d, post_type: e.target.value }))}
        >
          {POST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="fieldLabel" htmlFor={`${idPrefix}-author`}>
          Moderator display name
        </label>
        <input
          id={`${idPrefix}-author`}
          className="adminConsoleInput"
          value={state.author_name || ""}
          onChange={(e) => setState((d) => ({ ...d, author_name: e.target.value }))}
          placeholder="Josh, Hodge, or The Outreach Project"
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-photo`}>
          Feature image URL
        </label>
        <input
          id={`${idPrefix}-photo`}
          className="adminConsoleInput"
          value={state.photo_url || ""}
          onChange={(e) => setState((d) => ({ ...d, photo_url: e.target.value }))}
        />
        <AdminMediaUploadField label="Upload feature image" onUploaded={(url) => setState((d) => ({ ...d, photo_url: url }))} />
        <label className="fieldLabel">Carousel images (one URL per line)</label>
        <textarea
          className="adminConsoleInput"
          rows={3}
          value={(state.carousel_images || []).join("\n")}
          onChange={(e) =>
            setState((d) => ({
              ...d,
              carousel_images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
            }))
          }
        />
        <AdminMediaUploadField
          label="Upload carousel image"
          onUploaded={(url) => setState((d) => ({ ...d, carousel_images: [...(d.carousel_images || []), url] }))}
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-video`}>
          Video URL
        </label>
        <input
          id={`${idPrefix}-video`}
          className="adminConsoleInput"
          value={state.video_url || ""}
          onChange={(e) => setState((d) => ({ ...d, video_url: e.target.value }))}
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-podcast`}>
          Podcast episode URL
        </label>
        <input
          id={`${idPrefix}-podcast`}
          className="adminConsoleInput"
          value={state.podcast_url || ""}
          onChange={(e) => setState((d) => ({ ...d, podcast_url: e.target.value }))}
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-resource`}>
          Resource / external link URL
        </label>
        <input
          id={`${idPrefix}-resource`}
          className="adminConsoleInput"
          value={state.resource_url || ""}
          onChange={(e) => setState((d) => ({ ...d, resource_url: e.target.value }))}
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-cta-label`}>
          CTA button label (optional)
        </label>
        <input
          id={`${idPrefix}-cta-label`}
          className="adminConsoleInput"
          value={state.cta_label || ""}
          onChange={(e) => setState((d) => ({ ...d, cta_label: e.target.value }))}
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-cta-url`}>
          CTA URL (optional)
        </label>
        <input
          id={`${idPrefix}-cta-url`}
          className="adminConsoleInput"
          value={state.cta_url || ""}
          onChange={(e) => setState((d) => ({ ...d, cta_url: e.target.value }))}
        />
        <label className="fieldLabel" htmlFor={`${idPrefix}-tags`}>
          Tags (comma-separated)
        </label>
        <input
          id={`${idPrefix}-tags`}
          className="adminConsoleInput"
          value={state.tags || ""}
          onChange={(e) => setState((d) => ({ ...d, tags: e.target.value }))}
        />
        <div className="adminCheckboxRow">
          <label className="fieldLabel">
            <input
              type="checkbox"
              checked={!!state.is_pinned}
              onChange={(e) => setState((d) => ({ ...d, is_pinned: e.target.checked }))}
            />{" "}
            Pin to top of feed
          </label>
          <label className="fieldLabel">
            <input
              type="checkbox"
              checked={state.comments_enabled !== false}
              onChange={(e) => setState((d) => ({ ...d, comments_enabled: e.target.checked }))}
            />{" "}
            Comments enabled
          </label>
          <label className="fieldLabel">
            <input
              type="checkbox"
              checked={!!state.featured}
              onChange={(e) => setState((d) => ({ ...d, featured: e.target.checked }))}
            />{" "}
            Featured
          </label>
          {idPrefix === "create" ? (
            <label className="fieldLabel">
              <input
                type="checkbox"
                checked={!!state.publish}
                onChange={(e) => setState((d) => ({ ...d, publish: e.target.checked }))}
              />{" "}
              Publish immediately
            </label>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <AdminPanelShell panelId="community" error={error} message={statusMsg}>
      <p className="adminMuted adminMb4">
        Community Management — create and publish moderator-led posts for the public feed. Member posting is disabled in
        V1; use this builder for all community content.
      </p>
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
        <button type="button" className="btnPrimary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Close builder" : "New post"}
        </button>
      </div>

      {showCreate ? (
        <div className="adminFieldStack adminFieldStack--bordered adminCommunityBuilder">
          <h3 className="adminBlockTitle">Post builder</h3>
          {renderPostBuilderForm(draft, setDraft, "create")}
          <div className="adminToolbar">
            <button type="button" className="btnSoft" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "Preview"}
            </button>
            <button type="button" className="btnPrimary" disabled={busy === "create"} onClick={() => void createPost()}>
              {draft.publish ? "Publish post" : "Save draft"}
            </button>
          </div>
          {showPreview ? (
            <div className="adminCommunityPreview card">
              <h4>{draft.title || "Untitled post"}</h4>
              {isLikelyHtml(draft.body) ? (
                <div
                  className="communityPostBody communityPostBody--rich"
                  dangerouslySetInnerHTML={{ __html: sanitizeAdminHtml(draft.body) }}
                />
              ) : (
                <p>{draft.body}</p>
              )}
              {draft.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.photo_url} alt="" className="adminCommunityPreviewImage" />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <h2 className="adminSectionTitle">
        {SCOPES.find((s) => s.id === scope)?.label || "Posts"}
        {!loading ? ` (${posts.length})` : ""}
      </h2>

      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading && posts.length === 0 ? (
        <p className="adminMuted">No posts in this view. Create a draft or publish a post to get started.</p>
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
                    {p.is_pinned ? " · pinned" : ""}
                    {p.comments_enabled === false ? " · comments off" : ""}
                  </div>
                  <div className="adminPostMeta">
                    <span>Updated: {formatWhen(p.updated_at || p.created_at)}</span>
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
                  <button
                    type="button"
                    className="btnSoft"
                    disabled={!!busy}
                    onClick={() => void act(p.id, "update", { is_pinned: !p.is_pinned })}
                  >
                    {p.is_pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    type="button"
                    className="btnSoft"
                    disabled={!!busy}
                    onClick={() =>
                      void act(p.id, "update", { comments_enabled: p.comments_enabled === false })
                    }
                  >
                    {p.comments_enabled === false ? "Enable comments" : "Disable comments"}
                  </button>
                  <button type="button" className="btnSoft" disabled={!!busy} onClick={() => void act(p.id, "hide")}>
                    Archive
                  </button>
                  <button type="button" className="btnSoft" onClick={() => openEdit(p)}>
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
                <p className="adminEntityCard__body adminEntityCard__body--pre">{p.body}</p>
              )}
              {editId === p.id && editDraft ? (
                <div className="adminFieldStack adminMt4">
                  {renderPostBuilderForm(editDraft, setEditDraft, `edit-${p.id}`)}
                  <div className="adminToolbar">
                    <button type="button" className="btnPrimary" disabled={!!busy} onClick={() => void saveEdit(p.id)}>
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="btnSoft"
                      onClick={() => {
                        setEditId("");
                        setEditDraft(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {isPublished ? <AdminPostComments postId={p.id} /> : null}
            </article>
          );
        })}
      </div>
    </AdminPanelShell>
  );
}
