"use client";

import "@/features/community/community-feed.css";
import { useState } from "react";
import Link from "next/link";
import IconWrap from "@/components/shared/IconWrap";
import CommunityTrustDisclosure from "@/features/community/components/CommunityTrustDisclosure";
import CommunityConnectionsPanel from "@/features/community/components/CommunityConnectionsPanel";
import CommunityMemberProfileModal from "@/features/community/components/CommunityMemberProfileModal";
import CommunityPostCard from "@/features/community/components/CommunityPostCard";
import { isModeratorUser } from "@/features/community/api/communityApi";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import { workosSignUpHref } from "@/lib/auth/workosReturnTo";
import { shouldUseHostedWorkOSAuth } from "@/lib/auth/hostedWorkOSAuth";
import {
  openWebLogin,
  openWebSignup,
  requiresExternalWebAccountFlow,
} from "@/lib/capacitor/webAccountRedirects";

const V1_POSTING_MESSAGE =
  "Community posting is currently moderator-led for launch. Members can comment, react, and participate in discussions now. Member posting is coming in a future update.";

function CommunityIcon() {
  const path = "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6M3 19c0-2.8 2.8-4 5-4s5 1.2 5 4m3 0c0-2.4 2.3-3.5 5-3.5 2.1 0 5 1 5 3.5";
  return <IconWrap path={path} />;
}

/**
 * Community hub — curated moderator content for V1; members view, like, and comment.
 */
export default function CommunityPage({
  supabase,
  userId,
  sessionKind = "none",
  isAuthenticated,
  authLoading = false,
  authBackend = { workos: false },
  canCreatePost = false,
  isPlatformAdmin = false,
  profile,
  onRequestSignIn,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const { posts, loading, error, refresh, onToggleLike } = useCommunityFeed(supabase, userId, {
    feedScope: "public",
    sessionKind,
    isAuthenticated,
  });
  const canModerate = isAuthenticated && isModeratorUser({ userId, profile });
  const workosCommunitySignUpHref = workosSignUpHref("/community", { rememberDevice: readRememberDevicePref() });
  const hostedAuth = shouldUseHostedWorkOSAuth(authBackend);

  function handleCreateAccount() {
    if (requiresExternalWebAccountFlow() && hostedAuth) {
      void openWebSignup({ returnPath: "/membership/success" });
      return;
    }
    if (hostedAuth) {
      window.location.assign(workosCommunitySignUpHref);
      return;
    }
    onRequestSignIn?.();
  }

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
          <div className="communityHeroIcon" aria-hidden="true">
            <CommunityIcon />
          </div>
          <div className="communityHeroTitles">
            <p className="introTagline">Community</p>
            <h2>Curated updates from the Outreach Project team</h2>
          </div>
        </div>
        <p className="communityHeroText">
          A calm space for mission-aligned guidance and discussion. Josh and Hodge share practical guides, resources,
          and encouragement for veterans, first responders, families, and partners. Members can react and join the
          conversation on every published post.
        </p>
        {!isAuthenticated ? (
          <div className="row wrap">
            {hostedAuth ? (
              <>
                <button className="btnPrimary" type="button" onClick={handleCreateAccount}>
                  Create account
                </button>
                <button
                  className="btnSoft"
                  type="button"
                  onClick={() => {
                    if (requiresExternalWebAccountFlow()) {
                      void openWebLogin({
                        returnPath: "/community",
                        rememberDevice: readRememberDevicePref(),
                      });
                      return;
                    }
                    onRequestSignIn?.();
                  }}
                >
                  Sign in
                </button>
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
            {canCreatePost ? (
              <Link href="/admin/community" className="btnPrimary">
                Manage community posts
              </Link>
            ) : null}
            <button type="button" className="btnSoft" onClick={() => refresh()}>
              Refresh feed
            </button>
          </div>
        )}
      </section>

      <CommunityTrustDisclosure />

      {isAuthenticated && !canCreatePost ? (
        <section className="card communitySection communityV1Notice" aria-label="Community posting">
          <p className="communityV1NoticeText">{V1_POSTING_MESSAGE}</p>
        </section>
      ) : null}

      {isAuthenticated ? (
        <CommunityConnectionsPanel
          userId={userId}
          viewerProfileId={profile?.profileRecordId || ""}
          onOpenMember={setSelectedMemberId}
        />
      ) : (
        <section className="card communitySection communitySignedOutHint">
          <h3>Participation</h3>
          <p className="sponsorSectionLead">
            Sign in with your Outreach Project account to like posts, explore member connections, and comment on
            moderator-led discussions. The feed below shows published posts only.
          </p>
        </section>
      )}

      <section className="card communitySection">
        <div className="communitySectionHead">
          <h3>Community feed</h3>
          <div className="communityPillRow">
            <span className="communityApprovedPill">Published posts</span>
            {canModerate ? (
              <span className="communityModeratorPill">
                Moderator access
                {isPlatformAdmin ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link href="/admin/community" className="communityModeratorPillLink">
                      Admin panel
                    </Link>
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>

        <p className="communityFeedIntro">
          Moderator guides from Josh and Hodge walk through accounts, trusted resources, the directory, podcasts,
          sponsors, and community participation—each with practical steps and links.
        </p>

        {loading ? <p className="communityFeedStatus">Loading posts…</p> : null}
        {error ? <p className="applyError">{error}</p> : null}
        {!loading && !posts.length ? (
          <div className="emptyState">
            <CommunityIcon />
            <div>
              <strong>No published posts yet</strong>
              <p>Check back soon for curated updates from the Outreach Project team.</p>
            </div>
          </div>
        ) : null}
        <div className="communityFeed">
          {posts.map((p) => (
            <CommunityPostCard
              key={p.id}
              post={p}
              isAuthenticated={isAuthenticated}
              canModerate={canModerate}
              onOpenAuthor={(key) => setSelectedMemberId(String(key || "").trim())}
              onToggleLike={
                isAuthenticated && (sessionKind === "workos" || typeof onToggleLike === "function")
                  ? onToggleLike
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {selectedMemberId ? (
        <CommunityMemberProfileModal
          supabase={supabase}
          memberId={selectedMemberId}
          sessionKind={sessionKind}
          onToggleLike={isAuthenticated && sessionKind === "workos" ? onToggleLike : undefined}
          onClose={() => setSelectedMemberId("")}
        />
      ) : null}
    </div>
  );
}
