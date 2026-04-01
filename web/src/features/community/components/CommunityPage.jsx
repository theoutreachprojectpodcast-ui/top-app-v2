"use client";

import { useMemo, useState } from "react";
import IconWrap from "@/components/shared/IconWrap";
import CommunityModerationPanel from "@/features/community/components/CommunityModerationPanel";
import CommunityPostCard from "@/features/community/components/CommunityPostCard";
import CommunitySubmissionForm from "@/features/community/components/CommunitySubmissionForm";
import { COMMUNITY_FOLLOWS_SEED, COMMUNITY_MEMBERS_SEED } from "@/features/community/data/communitySeed";
import { useCommunityFeed } from "@/features/community/hooks/useCommunityFeed";

function CommunityIcon() {
  const path = "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6M3 19c0-2.8 2.8-4 5-4s5 1.2 5 4m3 0c0-2.4 2.3-3.5 5-3.5 2.1 0 5 1 5 3.5";
  return <IconWrap path={path} />;
}

function followingNames(followerId) {
  return COMMUNITY_FOLLOWS_SEED.filter((f) => f.followerId === followerId)
    .map((f) => COMMUNITY_MEMBERS_SEED.find((m) => m.id === f.followingId)?.name)
    .filter(Boolean);
}

export default function CommunityPage({
  supabase,
  userId,
  isMember,
  fullName,
  profile,
  onRequestUpgrade,
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [modPanelKey, setModPanelKey] = useState(0);
  const authorName = fullName || [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Community member";
  const { posts, loading, error, refresh, onToggleLike } = useCommunityFeed(supabase, userId);

  const memberActivity = useMemo(() => {
    return COMMUNITY_MEMBERS_SEED.map((m) => ({
      ...m,
      follows: followingNames(m.id),
    }));
  }, []);

  return (
    <div className="communityPage">
      <section className="card cardHero communityHero">
        <div className="communityHeroIcon" aria-hidden="true"><CommunityIcon /></div>
        <p className="introTagline">Community</p>
        <h2>Stories worth sharing—carefully reviewed</h2>
        <p className="communityHeroText">
          A calm space for mission-aligned experiences: finding support, thanking organizations, and encouraging others.
          Every story is reviewed before it appears here.
        </p>
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
          <button type="button" className="btnSoft" onClick={() => refresh()}>Refresh feed</button>
        </div>
      </section>

      <section className="card communityTrustCard">
        <h3>How we keep this space safe</h3>
        <ul className="communityTrustList">
          <li><strong>Moderation-first</strong> — individual posts are not public until approved.</li>
          <li><strong>Mission-aligned</strong> — we prioritize helpful, respectful, veteran- and first-responder-centered stories.</li>
          <li><strong>Transparent</strong> — you will always know when content is pending review.</li>
        </ul>
      </section>

      <section className="card communitySection">
        <h3><CommunityIcon /> Member connections (demo)</h3>
        <p className="communitySectionLead">Sample members and follow relationships—foundation for richer profiles later.</p>
        <div className="communityMemberGrid">
          {memberActivity.map((m) => (
            <div key={m.id} className="communityMemberCard">
              <div className="communityMemberAvatar" aria-hidden="true">{m.initials}</div>
              <strong>{m.name}</strong>
              <span className="communityMemberRole">{m.role}</span>
              <p className="communityMemberTag">{m.tagline}</p>
              {m.follows.length ? (
                <p className="communityMemberFollows">Following: {m.follows.join(", ")}</p>
              ) : (
                <p className="communityMemberFollows muted">Following: —</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card communitySection">
        <div className="communitySectionHead">
          <h3>Community stories</h3>
          <span className="communityApprovedPill">Approved posts only</span>
        </div>
        {loading ? <p className="communityFeedStatus">Loading stories…</p> : null}
        {error ? <p className="applyError">{error}</p> : null}
        {!loading && !posts.length ? (
          <div className="emptyState">
            <CommunityIcon />
            <div>
              <strong>No approved stories yet</strong>
              <p>Check back soon—or submit your own for review.</p>
            </div>
          </div>
        ) : null}
        <div className="communityFeed">
          {posts.map((p) => (
            <CommunityPostCard key={p.id} post={p} onToggleLike={onToggleLike} />
          ))}
        </div>
      </section>

      <CommunityModerationPanel key={modPanelKey} onFeedChanged={refresh} />

      {submitOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="community-submit-title" onClick={() => setSubmitOpen(false)}>
          <div className="modalCard communitySubmitModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="sponsorApplyModalHead">
              <h3 id="community-submit-title">Share your story</h3>
              <button type="button" className="btnSoft sponsorModalClose" onClick={() => setSubmitOpen(false)}>Close</button>
            </div>
            <CommunitySubmissionForm
              supabase={supabase}
              userId={userId}
              authorName={authorName}
              authorAvatarUrl={profile.avatarUrl || ""}
              onClose={() => setSubmitOpen(false)}
              onSubmitted={() => {
                refresh();
                setModPanelKey((k) => k + 1);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

