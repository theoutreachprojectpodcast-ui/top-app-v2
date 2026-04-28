"use client";

import { useCallback, useEffect, useState } from "react";
import OrgHeaderImageReviewPanel from "@/features/nonprofits/admin/OrgHeaderImageReviewPanel";
import ModerationQueuePreview from "@/features/community/components/ModerationQueuePreview";

export default function AdminCommunityPanel() {
  const [tab, setTab] = useState("pending");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const scope = tab === "bookmarks" ? "bookmarked" : "pending";
      const res = await fetch(`/api/community/posts?scope=${scope}`, { credentials: "include", cache: "no-store" });
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
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id, action, extra = {}) {
    setBusy(id + action);
    setError("");
    try {
      const res = await fetch(`/api/community/posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Action failed.");
        return;
      }
      await load();
    } catch {
      setError("Action failed.");
    } finally {
      setBusy("");
    }
  }

  async function saveEdit(id) {
    setBusy(id + "edit");
    setError("");
    try {
      const res = await fetch(`/api/community/posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", title: editTitle, body: editBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Save failed.");
        return;
      }
      setEditId("");
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Community moderation</h2>
      <p className="adminMuted">
        Pending uses moderator scope; bookmarks require platform admin. Approve/deny/hide/edit persist to `community_posts`.
      </p>
      <div className="adminToolbar" style={{ gap: "8px" }}>
        <button type="button" className={tab === "pending" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("pending")}>
          Pending review
        </button>
        <button type="button" className={tab === "bookmarks" ? "btnPrimary" : "btnSoft"} onClick={() => setTab("bookmarks")}>
          Bookmarked follow-ups
        </button>
        <button type="button" className="btnSoft" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}
      {loading ? <p className="adminMuted">Loading…</p> : null}
      {!loading && posts.length === 0 ? <p className="adminMuted">No posts in this queue.</p> : null}
      <div className="adminPanelBody" style={{ gap: "16px" }}>
        {posts.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-lg, 12px)",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <strong>{p.title || "(no title)"}</strong>
                <div className="adminMuted" style={{ fontSize: "0.8rem" }}>
                  {p.id} · {p.status}
                  {p.admin_bookmark ? " · bookmarked" : ""}
                </div>
              </div>
              <div className="adminActionCell" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {tab === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="btnPrimary"
                      disabled={!!busy}
                      onClick={() => moderate(p.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btnSoft"
                      disabled={!!busy}
                      onClick={() => moderate(p.id, "reject", { rejectionReason: "Does not meet guidelines." })}
                    >
                      Reject
                    </button>
                    <button type="button" className="btnSoft" disabled={!!busy} onClick={() => moderate(p.id, "hide")}>
                      Hide
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="btnSoft"
                  disabled={!!busy}
                  onClick={() =>
                    moderate(p.id, p.admin_bookmark ? "unbookmark" : "bookmark", p.admin_bookmark ? {} : { note: "" })
                  }
                >
                  {p.admin_bookmark ? "Remove bookmark" : "Bookmark"}
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
              </div>
            </div>
            <p style={{ marginTop: "10px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{p.body}</p>
            {editId === p.id ? (
              <div className="adminFieldStack" style={{ marginTop: "12px" }}>
                <label className="fieldLabel" htmlFor={`t-${p.id}`}>
                  Title
                </label>
                <input
                  id={`t-${p.id}`}
                  className="adminConsoleInput"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <label className="fieldLabel" htmlFor={`b-${p.id}`}>
                  Body
                </label>
                <textarea id={`b-${p.id}`} className="adminConsoleInput" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                <div className="row wrap">
                  <button type="button" className="btnPrimary" disabled={!!busy} onClick={() => saveEdit(p.id)}>
                    Save edit
                  </button>
                  <button type="button" className="btnSoft" onClick={() => setEditId("")}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <hr className="adminRule" style={{ margin: "16px 0" }} />
      <OrgHeaderImageReviewPanel canModerate />
      <ModerationQueuePreview />
    </div>
  );
}
