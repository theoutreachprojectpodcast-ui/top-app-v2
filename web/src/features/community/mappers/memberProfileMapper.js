export function mapCommunityMemberProfile(member = {}, favoriteRows = [], approvedPosts = []) {
  return {
    id: String(member.id || ""),
    name: String(member.name || "Community member"),
    avatarUrl: String(member.avatar_url || ""),
    role: String(member.role || ""),
    location: String(member.location || ""),
    bio: String(member.bio || member.tagline || ""),
    favorites: Array.isArray(favoriteRows) ? favoriteRows : [],
    approvedPosts: (Array.isArray(approvedPosts) ? approvedPosts : []).filter(
      (post) => String(post?.status || "").toLowerCase() === "approved"
    ),
  };
}

