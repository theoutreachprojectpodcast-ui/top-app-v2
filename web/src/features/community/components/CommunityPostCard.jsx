"use client";

import { useState } from "react";
import Avatar from "@/components/shared/Avatar";
import CommunitySocialActions from "@/features/community/components/CommunitySocialActions";
import { sharePostDemo } from "@/features/community/api/communityApi";

const CATEGORY_LABEL = {
  success_story: "Success story",
  resource_help: "Found support",
  thank_you: "Thank you",
  nonprofit_impact: "Impact",
  milestone: "Milestone",
};

const POST_TYPE_LABEL = {
  share_story: "Story",
  review_nonprofit: "Nonprofit review",
  submit_feedback: "Feedback",
  success_story: "Success",
  recommend_resource: "Resource recommendation",
  community_update: "Community update",
};

export default function CommunityPostCard({ post, onToggleLike }) {
  const [shareBusy, setShareBusy] = useState(false);
  const displayName = post.showAuthorName ? post.authorName : "Community member";
  const avatarSrc = post.authorAvatarUrl || "/assets/top_profile_circle_1024.png";
  const cat = CATEGORY_LABEL[post.category] || "Story";

  async function onShare() {
    setShareBusy(true);
    try {
      await sharePostDemo(post);
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <article className="communityPostCard">
      <div className="communityPostHead">
        <Avatar src={avatarSrc} alt={displayName} className="communityPostAvatar" />
        <div className="communityPostMeta">
          <div className="communityPostAuthorRow">
            <strong>{displayName}</strong>
            <span className="communityPostBadge">{cat}</span>
            {post.postType ? <span className="communityPostTypeBadge">{POST_TYPE_LABEL[post.postType] || "Update"}</span> : null}
          </div>
          <time className="communityPostTime" dateTime={post.createdAt}>{post.relativeTime}</time>
        </div>
      </div>
      {post.title ? <h4 className="communityPostTitle">{post.title}</h4> : null}
      <p className="communityPostBody">{post.body}</p>
      {post.photoUrl ? (
        <div className="communityPostMedia">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.photoUrl} alt={post.title || "Community shared photo"} />
        </div>
      ) : null}
      {post.nonprofitName ? (
        <p className="communityPostNonprofit">
          <span className="communityPostNonprofitLabel">Organization</span>
          {post.nonprofitName}
        </p>
      ) : null}
      <CommunitySocialActions
        postId={post.id}
        baseLikeCount={Number(post.likeCount) || 0}
        liked={post.userLiked}
        likeCount={post.likeDisplay}
        onToggleLike={onToggleLike}
        onShare={onShare}
        shareBusy={shareBusy}
      />
    </article>
  );
}

