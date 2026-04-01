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
    <div className="communityPostActions">
      <button
        type="button"
        className={`communityActionBtn ${liked ? "isActive" : ""}`}
        onClick={() => onToggleLike(postId, baseLikeCount)}
        aria-pressed={liked}
      >
        <span className="communityActionIcon" aria-hidden="true">♥</span>
        <span>{liked ? "Liked" : "Like"}</span>
        <span className="communityActionCount">{likeCount}</span>
      </button>
      <button type="button" className="communityActionBtn" onClick={onShare} disabled={shareBusy}>
        <span className="communityActionIcon" aria-hidden="true">↗</span>
        <span>{shareBusy ? "…" : "Share"}</span>
      </button>
    </div>
  );
}

