"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/shared/Avatar";
import { avatarFallbackUrl } from "@/lib/avatarFallback";
import CommunitySocialActions from "@/features/community/components/CommunitySocialActions";
import CommunityPostBody from "@/features/community/components/CommunityPostBody";
import CommunityPostMedia from "@/features/community/components/CommunityPostMedia";
import CommunityPostCarousel from "@/features/community/components/CommunityPostCarousel";
import CommunityPostPodcastBlock from "@/features/community/components/CommunityPostPodcastBlock";
import CommunityPostResourceBlock from "@/features/community/components/CommunityPostResourceBlock";
import { sharePostDemo } from "@/features/community/api/communityApi";
import {
  isOutreachModeratorPost,
  OUTREACH_MODERATOR_AVATAR_URL,
  parsePostCta,
} from "@/features/community/domain/communityModerator";

const CATEGORY_LABEL = {
  success_story: "Success story",
  resource_help: "Found support",
  thank_you: "Thank you",
  nonprofit_impact: "Impact",
  milestone: "Milestone",
  platform_guide: "Platform guide",
  community_update: "Update",
};

const POST_TYPE_LABEL = {
  share_story: "Story",
  review_nonprofit: "Nonprofit review",
  submit_feedback: "Feedback",
  success_story: "Success",
  recommend_resource: "Resource recommendation",
  community_update: "Community update",
  platform_guide: "Guide",
  platform_guide_carousel: "Guide",
  platform_guide_image: "Guide",
  platform_guide_podcast: "Guide",
  platform_guide_resource: "Guide",
};

function PostCta({ cta: ctaProp }) {
  if (!ctaProp?.href || !ctaProp?.label) return null;
  const className = "btnPrimary communityPostCta";
  const href = ctaProp.href;
  if (/^https?:\/\//i.test(href) || href.startsWith("/api/")) {
    return (
      <a className={className} href={href}>
        {ctaProp.label}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {ctaProp.label}
    </Link>
  );
}

function isGuidePost(post) {
  const pt = String(post.postType || "");
  return pt === "platform_guide" || pt.startsWith("platform_guide_") || post.category === "platform_guide";
}

export default function CommunityPostCard({
  post,
  onToggleLike,
  showModerationStatus = false,
  onOpenAuthor,
  onRequestAuthorEdit,
}) {
  const [shareBusy, setShareBusy] = useState(false);
  const isModerator = isOutreachModeratorPost(post);
  const isGuide = isGuidePost(post);
  const layout = post.layout || "step";
  const displayName = post.showAuthorName ? post.authorName : "Community member";
  const avatarSrc = isModerator
    ? OUTREACH_MODERATOR_AVATAR_URL
    : post.authorAvatarUrl || avatarFallbackUrl(post.authorId || post.id);
  const authorLookupKey = String(post.authorProfileId || post.authorId || "").trim();
  const cat = CATEGORY_LABEL[post.category] || (isGuide ? "Platform guide" : "Story");
  const cta = post.cta || parsePostCta(post.linkUrl);
  const canEditStory =
    typeof onRequestAuthorEdit === "function" &&
    showModerationStatus &&
    (post.status === "pending_review" || post.status === "approved");

  const showHeroImage =
    post.photoUrl &&
    layout !== "carousel" &&
    layout !== "podcast" &&
    layout !== "resource" &&
    layout !== "image";

  async function onShare() {
    setShareBusy(true);
    try {
      await sharePostDemo(post);
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <article
      className={`communityPostCard${isGuide ? " communityPostCard--guide" : ""}${isModerator ? " communityPostCard--moderator" : ""} communityPostCard--layout-${layout}`}
    >
      <div className="communityPostTop">
        <Avatar
          src={avatarSrc}
          alt={isModerator ? "The Outreach Project moderator" : displayName}
          className={`communityPostAvatar${isModerator ? " communityPostAvatar--moderator" : ""}`}
          sizes="52px"
        />
        <div className="communityPostMeta">
          <div className="communityPostAuthorRow">
            {onOpenAuthor && authorLookupKey && !isModerator ? (
              <button
                type="button"
                className="communityPostAuthorTrigger"
                onClick={() => onOpenAuthor(authorLookupKey)}
              >
                {displayName}
              </button>
            ) : (
              <div className="communityPostAuthorBlock">
                <strong className="communityPostAuthorName">{displayName}</strong>
                {isModerator ? (
                  <span className="communityPostModeratorByline">The Outreach Project team</span>
                ) : null}
              </div>
            )}
            {isModerator ? <span className="communityPostModeratorBadge">Outreach moderator</span> : null}
            {showModerationStatus && post.status && post.status !== "approved" ? (
              <span className="communityPostStatusBadge">{post.statusLabel || post.status}</span>
            ) : null}
            <span className="communityPostBadge">{cat}</span>
            {!isGuide && post.postType ? (
              <span className="communityPostTypeBadge">{POST_TYPE_LABEL[post.postType] || "Update"}</span>
            ) : null}
          </div>
          <time className="communityPostTime" dateTime={post.createdAt}>
            {post.relativeTime}
          </time>
          {post.title ? <h4 className="communityPostTitle">{post.title}</h4> : null}
        </div>
      </div>
      <div className="communityPostContent">
        {layout === "carousel" && post.carouselSlides?.length ? (
          <CommunityPostCarousel slides={post.carouselSlides} ariaLabel={post.title || "Guide slides"} />
        ) : null}
        {layout === "podcast" ? <CommunityPostPodcastBlock title={post.title} /> : null}
        {layout === "resource" && post.resourceHighlight ? (
          <CommunityPostResourceBlock resource={post.resourceHighlight} />
        ) : null}
        {layout === "image" && post.photoUrl ? (
          <>
            <CommunityPostMedia
              src={post.photoUrl}
              alt={post.imageAlt || post.title || "Guide image"}
              className="communityPostMedia--feature"
              priority
            />
            {post.mediaCaption ? <p className="communityPostMediaCaption">{post.mediaCaption}</p> : null}
          </>
        ) : null}
        <CommunityPostBody body={post.body} isGuide={isGuide} />
        {showHeroImage ? (
          <CommunityPostMedia src={post.photoUrl} alt={post.imageAlt || post.title || "Post cover"} />
        ) : null}
        {cta ? (
          <div className="communityPostCtaRow">
            <PostCta cta={cta} />
          </div>
        ) : null}
      </div>
      {post.nonprofitName ? (
        <p className="communityPostNonprofit">
          <span className="communityPostNonprofitLabel">Organization</span>
          {post.nonprofitName}
        </p>
      ) : null}
      {canEditStory ? (
        <div className="communityPostAuthorEditRow">
          <button type="button" className="btnSoft communityPostEditBtn" onClick={() => onRequestAuthorEdit(post)}>
            Edit story
          </button>
        </div>
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
