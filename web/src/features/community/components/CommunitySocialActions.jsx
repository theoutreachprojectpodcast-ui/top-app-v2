"use client";

export default function CommunitySocialActions({
  postId,
  baseLikeCount,
  liked,
  likeCount,
  onToggleLike,
  onShare,
  shareBusy,
}) {
  return (
    <div className="communityPostActions" role="group" aria-label="Post reactions">
      <button
        type="button"
        className={`communityActionBtn communityActionBtn--like ${liked ? "isActive" : ""}`}
        onClick={() => onToggleLike(postId, baseLikeCount)}
        aria-pressed={liked}
      >
        <span className="communityActionIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
        <span>{liked ? "Liked" : "Like"}</span>
        <span className="communityActionCount">{likeCount}</span>
      </button>
      <button
        type="button"
        className="communityActionBtn communityActionBtn--share"
        onClick={onShare}
        disabled={shareBusy}
      >
        <span className="communityActionIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v15" />
          </svg>
        </span>
        <span>{shareBusy ? "…" : "Share"}</span>
      </button>
    </div>
  );
}

