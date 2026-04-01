export function mapCommunityPostRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    createdAt: row.created_at || row.createdAt,
    authorId: String(row.author_id || row.authorId || ""),
    authorName: String(row.author_name || row.authorName || "Community member"),
    authorAvatarUrl: String(row.author_avatar_url || row.authorAvatarUrl || ""),
    title: String(row.title || "").trim(),
    body: String(row.body || "").trim(),
    nonprofitEin: row.nonprofit_ein != null ? String(row.nonprofit_ein) : null,
    nonprofitName: String(row.nonprofit_name || row.nonprofitName || "").trim(),
    category: String(row.category || "success_story"),
    showAuthorName: row.show_author_name !== false,
    linkUrl: String(row.link_url || row.linkUrl || "").trim(),
    status: String(row.status || "submitted"),
    likeCount: Number(row.like_count ?? row.likeCount ?? 0) || 0,
    shareCount: Number(row.share_count ?? row.shareCount ?? 0) || 0,
    reviewedBy: row.reviewed_by || row.reviewedBy || null,
    reviewedAt: row.reviewed_at || row.reviewedAt || null,
    rejectionReason: row.rejection_reason || row.rejectionReason || "",
  };
}

