"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import IconWrap from "@/components/shared/IconWrap";
import CommunityTrustDisclosure from "@/features/community/components/CommunityTrustDisclosure";
import CommunityModerationPanel from "@/features/community/components/CommunityModerationPanel";
import ModerationQueuePreview from "@/features/community/components/ModerationQueuePreview";
import CommunityConnectionsPanel from "@/features/community/components/CommunityConnectionsPanel";
import CommunityMemberProfileModal from "@/features/community/components/CommunityMemberProfileModal";
import CommunityPostCard from "@/features/community/components/CommunityPostCard";
import CommunitySubmissionForm from "@/features/community/components/CommunitySubmissionForm";
import { isModeratorUser } from "@/features/community/api/communityApi";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";

function CommunityIcon() {
  const path = "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6M3 19c0-2.8 2.8-4 5-4s5 1.2 5 4m3 0c0-2.4 2.3-3.5 5-3.5 2.1 0 5 1 5 3.5";
  return <IconWrap path={path} />;
}

/**
 * Community hub — public feed from Supabase (via API); Member-tier posts go through moderation.
 */
export default function CommunityPage({
  supabase,
  userId,
  sessionKind = "none",
  isAuthenticated,
  authLoading = false,
  authBackend = { workos: false },
  isMember,
  fullName,
  profile,
  onRequestUpgrade,
  onRequestSignIn,
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [modPanelKey, setModPanelKey] = useState(0);
  const [feedTab, setFeedTab] = useState("latest");

  const authorName = fullName || [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Community member";
  const feedScope =
    isAuthenticated && feedTab === "mine" && sessionKind === "workos" ? "mine" : "public";
  const { posts, loading, error, refresh, onToggleLike } = useCommunityFeed(supabase, userId, {
    feedScope,
    sessionKind,
    isAuthenticated,
  });
  const canModerate = isAuthenticated && isModeratorUser({ userId, profile });
  const useWorkOSApi = authBackend.workos && sessionKind === "workos";

  useEffect(() => {
    if (!isAuthenticated) setFeedTab("latest");
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="communityPage">
        <section className="card cardHero communityHero">
          <p className="communityFeedStatus">Loading your session…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="communityPage">
      <section className="card cardHero communityHero">
        <div className="communityHeroTop">
          <div className="communityHeroIcon" aria-hidden="true"><CommunityIcon /></div>
          <div className="communityHeroTitles">
            <p className="introTagline">Community</p>
            <h2>Stories worth sharing—carefully reviewed</h2>
          </div>
        </div>
        <p className="communityHeroText">
          A calm space for mission-aligned experiences: finding support, thanking organizations, and encouraging others.
          Every story is reviewed before it appears in the public feed.
        </p>
        {!isAuthenticated ? (
          <div className="row wrap">
            {authBackend.workos ? (
              <>
                <a className="btnPrimary" href="/api/auth/workos/signup?returnTo=/community">
                  Create account
                </a>
                <a className="btnSoft" href="/api/auth/workos/signin?returnTo=/community">
                  Sign in
                </a>
              </>
            ) : (
              <>
                <button type="button" className="btnPrimary" onClick={onRequestSignIn}>
                  Sign in
                </button>
                <Link className="btnSoft" href="/?signin=1&signup=1">
                  Create account
                </Link>
              </>
            )}
            <Link className="btnSoft" href="/">
              Back to home
            </Link>
          </div>
        ) : (
          <div className="row wrap">
            {isMember ? (
              <button type="button" className="btnPrimary" onClick={() => setSubmitOpen(true)}>
                Share your story
              </button>
            ) : (
              <button type="button" className="btnPrimary" onClick={onRequestUpgrade}>
                Become a member to submit a story
              </button>
            )}
            <button type="button" className="btnSoft" onClick={() => refresh()}>
              Refresh
            </button>
          </div>
        )}
      </section>

      <CommunityTrustDisclosure />

      {isAuthenticated ? (
        <CommunityConnectionsPanel userId={userId} onOpenMember={setSelectedMemberId} />
      ) : (
        <section className="card communitySection communitySignedOutHint">
          <h3>Participation</h3>
          <p className="sponsorSectionLead">
            Sign in with your Outreach Project account to like posts (saved to your profile), explore member connections, and—at
            the Member tier—submit stories for moderator review. The latest feed below shows approved posts only.
          </p>
        </section>
      )}

      <section className="card communitySection">
        <div className="communitySectionHead">
          <h3>Community stories</h3>
          <div className="communityPillRow">
            <span className="communityApprovedPill">
              {feedTab === "latest" ? "Approved posts" : "Your submissions"}
            </span>
            {canModerate ? <span className="communityModeratorPill">Moderator access</span> : null}
          </div>
        </div>

        {isAuthenticated && sessionKind === "workos" ? (
          <div className="communityFeedTabs" role="tablist" aria-label="Feed view">
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === "latest"}
              className={`communityFeedTab ${feedTab === "latest" ? "isActive" : ""}`}
              onClick={() => setFeedTab("latest")}
            >
              Latest
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === "mine"}
              className={`communityFeedTab ${feedTab === "mine" ? "isActive" : ""}`}
              onClick={() => setFeedTab("mine")}
            >
              My posts
            </button>
          </div>
        ) : null}

        {loading ? <p className="communityFeedStatus">Loading stories…</p> : null}
        {error ? <p className="applyError">{error}</p> : null}
        {!loading && !posts.length ? (
          <div className="emptyState">
            <CommunityIcon />
            <div>
              <strong>{feedTab === "mine" ? "No posts on file yet" : "No approved stories yet"}</strong>
              <p>
                {feedTab === "mine"
                  ? "When you submit a story, it will appear here with its review status until it is published."
                  : "Check back soon—or become a Member to submit your own for review."}
              </p>
            </div>
          </div>
        ) : null}
        <div className="communityFeed">
          {posts.map((p) => (
            <CommunityPostCard
              key={p.id}
              post={p}
              showModerationStatus={feedTab === "mine"}
              onToggleLike={
                isAuthenticated && (sessionKind === "workos" || typeof onToggleLike === "function")
                  ? onToggleLike
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {isAuthenticated ? (
        <>
          <hr className="communityAdminDivider" aria-hidden="true" />
          <section className="communityAdminZone" aria-label="Community admin tools">
            <CommunityModerationPanel
              key={modPanelKey}
              supabase={supabase}
              userId={userId}
              canModerate={canModerate}
              onFeedChanged={refresh}
            />
            <ModerationQueuePreview />
          </section>
        </>
      ) : null}

      {submitOpen && isAuthenticated ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="community-submit-title" onClick={() => setSubmitOpen(false)}>
          <div className="modalCard communitySubmitModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="sponsorApplyModalHead">
              <h3 id="community-submit-title">Share your story</h3>
              <button type="button" className="btnSoft sponsorModalClose" onClick={() => setSubmitOpen(false)}>
                Close
              </button>
            </div>
            <CommunitySubmissionForm
              supabase={supabase}
              userId={userId}
              authorName={authorName}
              authorAvatarUrl={profile.avatarUrl || emptyProfileAvatarUrl()}
              useWorkOSApi={useWorkOSApi}
              onClose={() => setSubmitOpen(false)}
              onSubmitted={() => {
                refresh();
                setModPanelKey((k) => k + 1);
              }}
            />
          </div>
        </div>
      ) : null}
      {selectedMemberId ? (
        <CommunityMemberProfileModal
          supabase={supabase}
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId("")}
        />
      ) : null}
    </div>
  );
}
