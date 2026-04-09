"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/shared/Avatar";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import CommunityPostCard from "@/features/community/components/CommunityPostCard";
import {
  fetchApprovedPostsByMember,
  fetchMemberFavoriteRows,
  getCommunityMemberById,
  getRelativeTime,
  isAuthorProfileLookupKey,
} from "@/features/community/api/communityApi";
import { mapCommunityMemberProfile } from "@/features/community/mappers/memberProfileMapper";
import { avatarFallbackUrl } from "@/lib/avatarFallback";

function buildSyntheticMemberFromPosts(memberId, posts) {
  const first = Array.isArray(posts) ? posts[0] : null;
  const name =
    first?.authorName && String(first.authorName).trim() ? String(first.authorName).trim() : "Community member";
  return {
    id: memberId,
    name,
    avatar_url: first?.authorAvatarUrl ? String(first.authorAvatarUrl) : "",
    role: "",
    location: "",
    tagline: "",
    bio: "",
    favoriteEins: [],
  };
}

export default function CommunityMemberProfileModal({ supabase, memberId, onClose, sessionKind, onToggleLike }) {
  const [favoriteRows, setFavoriteRows] = useState([]);
  const [approvedPosts, setApprovedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const seedMember = useMemo(() => getCommunityMemberById(memberId), [memberId]);
  const uuidAuthor = useMemo(() => isAuthorProfileLookupKey(memberId), [memberId]);
  const displayMember = useMemo(() => {
    if (seedMember) return seedMember;
    if (uuidAuthor) return buildSyntheticMemberFromPosts(memberId, approvedPosts);
    return null;
  }, [seedMember, uuidAuthor, memberId, approvedPosts]);

  const profile = useMemo(
    () => mapCommunityMemberProfile(displayMember || {}, favoriteRows, approvedPosts),
    [displayMember, favoriteRows, approvedPosts]
  );

  const postsWithMeta = useMemo(
    () =>
      approvedPosts.map((p) => ({
        ...p,
        relativeTime: getRelativeTime(p.createdAt),
        likeDisplay: Number(p.likeCount) || 0,
        userLiked: !!p.viewerHasLiked,
      })),
    [approvedPosts]
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const posts = await fetchApprovedPostsByMember(supabase, memberId);
        if (!alive) return;
        setApprovedPosts(posts);
        let favorites = [];
        if (seedMember) {
          favorites = await fetchMemberFavoriteRows(supabase, seedMember);
          if (!alive) return;
        }
        setFavoriteRows(favorites);
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (!memberId) return undefined;
    if (!seedMember && !uuidAuthor) return undefined;
    load();
    return () => {
      alive = false;
    };
  }, [supabase, seedMember, memberId, uuidAuthor]);

  if (!memberId) return null;
  if (!seedMember && !uuidAuthor) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="community-member-profile-title" onClick={onClose}>
      <div className="modalCard communityMemberProfileModal" onClick={(e) => e.stopPropagation()}>
        <div className="sponsorApplyModalHead">
          <h3 id="community-member-profile-title">{displayMember.name}</h3>
          <button type="button" className="btnSoft sponsorModalClose" onClick={onClose}>Close</button>
        </div>

        <section className="communityMemberProfileHeader">
          <Avatar
            src={profile.avatarUrl || avatarFallbackUrl(displayMember.id)}
            alt={profile.name}
            className="communityMemberProfileAvatar"
          />
          <div className="communityMemberProfileMeta">
            <p className="introTagline">Community member</p>
            <h4>{profile.name}</h4>
            {profile.role || profile.location ? (
              <p>{[profile.role, profile.location].filter(Boolean).join(" · ")}</p>
            ) : null}
            {profile.bio ? <p className="communityMemberProfileBio">{profile.bio}</p> : null}
            {!profile.bio && uuidAuthor ? (
              <p className="communityMemberProfileBio communityMemberProfileBio--muted">
                Profile details stay minimal here; published stories below are verified community contributions.
              </p>
            ) : null}
          </div>
        </section>

        <section className="communityMemberProfileSection">
          <h4>Favorite organizations</h4>
          {loading && seedMember ? <p className="communityFeedStatus">Loading favorites…</p> : null}
          {!loading && !profile.favorites.length ? (
            <div className="emptyState"><div><strong>No favorites yet</strong><p>This member has not saved organizations yet.</p></div></div>
          ) : (
            <div className="results">
              {profile.favorites.map((row) => {
                const card = mapNonprofitCardRow(row, "directory");
                return (
                  <NonprofitCard
                    key={`member-fav-${displayMember.id}-${card.ein || card.id}`}
                    card={card}
                    actionMode="directory"
                    favoritesEnabled={false}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="communityMemberProfileSection">
          <h4>Approved community contributions</h4>
          {loading ? <p className="communityFeedStatus">Loading approved posts…</p> : null}
          {!loading && !profile.approvedPosts.length ? (
            <div className="emptyState"><div><strong>No approved posts yet</strong><p>When approved stories are published, they will appear here.</p></div></div>
          ) : (
            <div className="communityFeed">
              {postsWithMeta.map((post) => (
                <CommunityPostCard
                  key={`member-post-${post.id}`}
                  post={post}
                  onToggleLike={sessionKind === "workos" ? onToggleLike : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

