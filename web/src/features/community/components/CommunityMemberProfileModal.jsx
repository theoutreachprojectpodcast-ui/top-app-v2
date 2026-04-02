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
} from "@/features/community/api/communityApi";
import { mapCommunityMemberProfile } from "@/features/community/mappers/memberProfileMapper";

export default function CommunityMemberProfileModal({ supabase, memberId, onClose }) {
  const [favoriteRows, setFavoriteRows] = useState([]);
  const [approvedPosts, setApprovedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const member = useMemo(() => getCommunityMemberById(memberId), [memberId]);
  const profile = useMemo(
    () => mapCommunityMemberProfile(member || {}, favoriteRows, approvedPosts),
    [member, favoriteRows, approvedPosts]
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [favorites, posts] = await Promise.all([
          fetchMemberFavoriteRows(supabase, member),
          fetchApprovedPostsByMember(supabase, memberId),
        ]);
        if (!alive) return;
        setFavoriteRows(favorites);
        setApprovedPosts(posts);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [supabase, member, memberId]);

  if (!member) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="community-member-profile-title" onClick={onClose}>
      <div className="modalCard communityMemberProfileModal" onClick={(e) => e.stopPropagation()}>
        <div className="sponsorApplyModalHead">
          <h3 id="community-member-profile-title">{member.name}</h3>
          <button type="button" className="btnSoft sponsorModalClose" onClick={onClose}>Close</button>
        </div>

        <section className="communityMemberProfileHeader">
          <Avatar src={profile.avatarUrl || "/assets/top_profile_circle_1024.png"} alt={profile.name} className="communityMemberProfileAvatar" />
          <div className="communityMemberProfileMeta">
            <p className="introTagline">Community member</p>
            <h4>{profile.name}</h4>
            <p>{profile.role}{profile.location ? ` · ${profile.location}` : ""}</p>
            <p className="communityMemberProfileBio">{profile.bio}</p>
          </div>
        </section>

        <section className="communityMemberProfileSection">
          <h4>Favorite organizations</h4>
          {loading ? <p className="communityFeedStatus">Loading favorites…</p> : null}
          {!loading && !profile.favorites.length ? (
            <div className="emptyState"><div><strong>No favorites yet</strong><p>This member has not saved organizations yet.</p></div></div>
          ) : (
            <div className="results">
              {profile.favorites.map((row) => {
                const card = mapNonprofitCardRow(row, "directory");
                return <NonprofitCard key={`member-fav-${member.id}-${card.ein || card.id}`} card={card} actionMode="directory" isMember={false} />;
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
              {profile.approvedPosts.map((post) => (
                <CommunityPostCard key={`member-post-${post.id}`} post={post} onToggleLike={() => {}} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

