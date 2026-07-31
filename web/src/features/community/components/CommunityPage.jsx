"use client";

import "@/features/community/community-feed.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import IconWrap from "@/components/shared/IconWrap";
import CommunityTrustDisclosure from "@/features/community/components/CommunityTrustDisclosure";
import CommunityConnectionsPanel from "@/features/community/components/CommunityConnectionsPanel";
import CommunityMemberProfileModal from "@/features/community/components/CommunityMemberProfileModal";
import CommunityPostCard from "@/features/community/components/CommunityPostCard";
import CommunitySubmissionForm from "@/features/community/components/CommunitySubmissionForm";
import {
  deleteAuthorCommunityPost,
  isModeratorUser,
} from "@/features/community/api/communityApi";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";
import { readRememberDevicePref } from "@/lib/auth/lastUsedEmail";
import { workosSignUpHref } from "@/lib/auth/workosReturnTo";
import { shouldUseHostedWorkOSAuth } from "@/lib/auth/hostedWorkOSAuth";
import {
  openWebLogin,
  openWebSignup,
  requiresExternalWebAccountFlow,
} from "@/lib/capacitor/webAccountRedirects";
import {
  useScrollFocusedFieldIntoView,
  useVisualViewportOverlay,
} from "@/hooks/useVisualViewportOverlay";

function CommunityIcon() {
  const path = "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6M3 19c0-2.8 2.8-4 5-4s5 1.2 5 4m3 0c0-2.4 2.3-3.5 5-3.5 2.1 0 5 1 5 3.5";
  return <IconWrap path={path} />;
}

/**
 * Community hub — member posting + curated staff guides + friend connections.
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
  const searchParams = useSearchParams();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [feedSort, setFeedSort] = useState("connections_first");
  const [connectionsRefreshKey, setConnectionsRefreshKey] = useState(0);
  const composerScrollRef = useRef(null);
  const focusConnections =
    String(searchParams.get("connections") || "").trim() === "1" ||
    String(searchParams.get("tab") || "").trim().toLowerCase() === "connections";

  useVisualViewportOverlay(composerOpen);
  useScrollFocusedFieldIntoView(composerOpen, composerScrollRef);

  const { posts, loading, error, refresh, onToggleLike } = useCommunityFeed(supabase, userId, {
    feedScope: "public",
    sessionKind,
    isAuthenticated,
    authLoading,
    sort: feedSort,
  });
  const canModerate = isAuthenticated && isModeratorUser({ userId, profile });
  const workosCommunitySignUpHref = workosSignUpHref("/community", { rememberDevice: readRememberDevicePref() });
  const hostedAuth = shouldUseHostedWorkOSAuth(authBackend);
  const useWorkOSApi = sessionKind === "workos";
  const authorName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    profile?.displayName ||
    profile?.email ||
    "Community member";

  const friendPosts = useMemo(() => posts.filter((p) => p.fromConnection), [posts]);
  const otherPosts = useMemo(() => posts.filter((p) => !p.fromConnection), [posts]);
  const viewerProfileId = String(profile?.profileRecordId || "").trim();

  function isOwnPost(post) {
    if (!viewerProfileId) return false;
    return String(post?.authorProfileId || "").trim() === viewerProfileId;
  }

  function openCreateComposer() {
    setEditingPost(null);
    setComposerOpen(true);
  }

  function openEditComposer(post) {
    setEditingPost(post);
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setEditingPost(null);
  }

  useEffect(() => {
    if (!composerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [composerOpen]);

  async function handleAuthorDelete(post) {
    const result = await deleteAuthorCommunityPost(post?.id);
    if (!result.ok) {
      window.alert(result.message || "Could not delete post.");
      return;
    }
    refresh();
  }

  function renderPostCard(p) {
    return (
      <CommunityPostCard
        key={p.id}
        post={p}
        isAuthenticated={isAuthenticated}
        canModerate={canModerate}
        isOwnPost={isOwnPost(p)}
        onOpenAuthor={(key) => setSelectedMemberId(String(key || "").trim())}
        onRequestAuthorEdit={canCreatePost ? openEditComposer : undefined}
        onRequestAuthorDelete={canCreatePost ? handleAuthorDelete : undefined}
        onToggleLike={
          isAuthenticated && (sessionKind === "workos" || typeof onToggleLike === "function")
            ? onToggleLike
            : undefined
        }
      />
    );
  }

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
            <h2>Share updates and stay connected</h2>
          </div>
        </div>
        <p className="communityHeroText">
          A calm space for veterans, first responders, families, and partners. Share stories, connect with members, and
          follow practical guides from the Outreach Project team.
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
              <button type="button" className="btnPrimary" onClick={openCreateComposer}>
                Create a Post
              </button>
            ) : null}
            {isPlatformAdmin ? (
              <Link href="/admin/community" className="btnSoft">
                Admin Console
              </Link>
            ) : null}
            <button type="button" className="btnSoft" onClick={() => refresh()}>
              Refresh feed
            </button>
          </div>
        )}
      </section>

      <CommunityTrustDisclosure />

      {isAuthenticated && canCreatePost && composerOpen ? (
        <div
          className="modalOverlay modalOverlay--communitySubmit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-compose-title"
          onClick={closeComposer}
        >
          <div
            className="modalCard communitySubmitModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="communitySubmitModalHead">
              <h3 id="community-compose-title">{editingPost ? "Edit post" : "Create a Post"}</h3>
              <button type="button" className="btnSoft sponsorModalClose" onClick={closeComposer}>
                Close
              </button>
            </header>
            <div className="communitySubmitModalBody">
              <CommunitySubmissionForm
                supabase={supabase}
                userId={userId}
                authorName={authorName}
                authorAvatarUrl={profile?.avatarUrl || ""}
                useWorkOSApi={useWorkOSApi}
                editPost={editingPost}
                scrollRef={composerScrollRef}
                onClose={closeComposer}
                onSubmitted={() => {
                  closeComposer();
                  refresh();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {isAuthenticated && !canCreatePost ? (
        <section className="card communitySection communityV1Notice" aria-label="Community posting">
          <p className="communityV1NoticeText">
            Community posting requires an active Pro Membership. If posting was restricted on your account, contact
            support.
          </p>
        </section>
      ) : null}

      {isAuthenticated ? (
        <CommunityConnectionsPanel
          userId={userId}
          viewerProfileId={profile?.profileRecordId || ""}
          refreshKey={connectionsRefreshKey}
          onOpenMember={setSelectedMemberId}
          focusRequests={focusConnections}
        />
      ) : (
        <section className="card communitySection communitySignedOutHint">
          <h3>Participation</h3>
          <p className="sponsorSectionLead">
            Sign in with your Outreach Project account to post, connect with members, like posts, and join the
            conversation.
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

        {isAuthenticated ? (
          <div className="row wrap communityFeedSortRow" role="group" aria-label="Feed sort">
            <button
              type="button"
              className={`btnSoft${feedSort === "connections_first" ? " isActive" : ""}`}
              onClick={() => setFeedSort("connections_first")}
            >
              From your connections first
            </button>
            <button
              type="button"
              className={`btnSoft${feedSort === "chronological" ? " isActive" : ""}`}
              onClick={() => setFeedSort("chronological")}
            >
              Newest first
            </button>
          </div>
        ) : null}

        <p className="communityFeedIntro">
          Posts from people you’ve connected with appear first when that sort is selected. Staff guides stay available
          below member updates.
        </p>

        {loading ? <p className="communityFeedStatus">Loading posts…</p> : null}
        {error ? <p className="applyError">{error}</p> : null}
        {!loading && !posts.length ? (
          <div className="emptyState">
            <CommunityIcon />
            <div>
              <strong>No published posts yet</strong>
              <p>
                {canCreatePost
                  ? "Be the first to share an update with the community."
                  : "Check back soon for community updates."}
              </p>
            </div>
          </div>
        ) : null}

        {feedSort === "connections_first" && friendPosts.length ? (
          <div className="communityFeedBand">
            <h4 className="communityFeedBandTitle">From your connections</h4>
            <div className="communityFeed">{friendPosts.map(renderPostCard)}</div>
          </div>
        ) : null}

        <div className="communityFeedBand">
          {feedSort === "connections_first" && friendPosts.length ? (
            <h4 className="communityFeedBandTitle">Community updates</h4>
          ) : null}
          <div className="communityFeed">
            {(feedSort === "connections_first" ? otherPosts : posts).map(renderPostCard)}
          </div>
        </div>
      </section>

      {selectedMemberId ? (
        <CommunityMemberProfileModal
          supabase={supabase}
          memberId={selectedMemberId}
          sessionKind={sessionKind}
          viewerProfileId={viewerProfileId}
          onToggleLike={isAuthenticated && sessionKind === "workos" ? onToggleLike : undefined}
          onClose={() => setSelectedMemberId("")}
          onConnectionChange={() => {
            setConnectionsRefreshKey((k) => k + 1);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
