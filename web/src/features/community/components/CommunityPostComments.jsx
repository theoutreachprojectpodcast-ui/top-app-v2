"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import { avatarFallbackUrl } from "@/lib/avatarFallback";
import { getRelativeTime } from "@/features/community/api/communityApi";

/**
 * @param {{ postId: string, commentsEnabled?: boolean, isAuthenticated?: boolean, canModerate?: boolean }} props
 */
export default function CommunityPostComments({
  postId,
  commentsEnabled = true,
  isAuthenticated = false,
  canModerate = false,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(!commentsEnabled);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setComments([]);
        setError(data.message || data.error || "Could not load comments.");
        return;
      }
      setClosed(data.commentsEnabled === false);
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      setError("Could not load comments.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitComment(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not post comment.");
        return;
      }
      if (data.comment) {
        setComments((prev) => [
          ...prev,
          { ...data.comment, relativeTime: getRelativeTime(data.comment.createdAt) },
        ]);
      }
      setDraft("");
    } catch {
      setError("Could not post comment.");
    } finally {
      setBusy(false);
    }
  }

  async function moderateComment(commentId, action) {
    if (!canModerate) return;
    try {
      const res = await fetch(
        `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) return;
      if (action === "delete" || action === "hide") {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      /* ignore */
    }
  }

  if (closed) {
    return (
      <div className="communityPostComments communityPostComments--closed">
        <p className="communityPostCommentsNote">Comments are closed on this post.</p>
      </div>
    );
  }

  return (
    <div className="communityPostComments">
      <h5 className="communityPostCommentsTitle">
        Comments{comments.length ? ` (${comments.length})` : ""}
      </h5>
      {loading ? <p className="communityPostCommentsStatus">Loading comments…</p> : null}
      {error ? <p className="applyError communityPostCommentsError">{error}</p> : null}
      {!loading && !error && comments.length === 0 ? (
        <p className="communityPostCommentsEmpty">Be the first to join the discussion.</p>
      ) : null}
      <ul className="communityPostCommentsList">
        {comments.map((c) => (
          <li key={c.id} className="communityPostComment">
            <Avatar
              src={c.authorAvatarUrl || avatarFallbackUrl(c.profileId || c.id)}
              alt={c.authorName || "Member"}
              className="communityPostCommentAvatar"
              sizes="36px"
            />
            <div className="communityPostCommentBody">
              <div className="communityPostCommentMeta">
                <strong>{c.authorName || "Member"}</strong>
                <time dateTime={c.createdAt}>{c.relativeTime || getRelativeTime(c.createdAt)}</time>
              </div>
              <p>{c.body}</p>
              {canModerate ? (
                <div className="communityPostCommentMod">
                  <button type="button" className="btnSoft" onClick={() => void moderateComment(c.id, "hide")}>
                    Hide
                  </button>
                  <button type="button" className="btnSoft" onClick={() => void moderateComment(c.id, "delete")}>
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {isAuthenticated ? (
        <form className="communityPostCommentForm" onSubmit={(e) => void submitComment(e)}>
          <label className="fieldLabel" htmlFor={`comment-${postId}`}>
            Add a comment
          </label>
          <textarea
            id={`comment-${postId}`}
            className="communityPostCommentInput"
            rows={3}
            maxLength={4000}
            placeholder="Share your thoughts…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btnPrimary" disabled={busy || draft.trim().length < 2}>
            {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="communityPostCommentsNote">Sign in to comment on this post.</p>
      )}
    </div>
  );
}
