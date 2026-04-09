const STATUS_LABELS = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Published",
  rejected: "Not published",
  hidden: "Hidden",
  submitted: "Pending review",
  under_review: "Pending review",
};

export function mapCommunityPostRow(row) {
  if (!row) return null;
  const status = String(row.status || "pending_review").toLowerCase();
  return {
    id: String(row.id),
    createdAt: row.created_at || row.createdAt,
    authorProfileId: row.author_profile_id ? String(row.author_profile_id) : "",
    authorId: String(row.author_id || row.authorId || ""),
    authorName: String(row.author_name || row.authorName || "Community member"),
    authorAvatarUrl: String(row.author_avatar_url || row.authorAvatarUrl || ""),
    title: String(row.title || "").trim(),
    body: String(row.body || "").trim(),
    nonprofitEin: row.nonprofit_ein != null ? String(row.nonprofit_ein) : null,
    nonprofitName: String(row.nonprofit_name || row.nonprofitName || "").trim(),
    category: String(row.category || "success_story"),
    postType: String(row.post_type || row.postType || "share_story"),
    showAuthorName: row.show_author_name !== false,
    linkUrl: String(row.link_url || row.linkUrl || "").trim(),
    photoUrl: String(row.photo_url || row.photoUrl || "").trim(),
    status,
    statusLabel: STATUS_LABELS[status] || status,
    visibility: String(row.visibility || "community"),
    likeCount: Number(row.like_count ?? row.likeCount ?? 0) || 0,
    shareCount: Number(row.share_count ?? row.shareCount ?? 0) || 0,
    reviewedBy: row.reviewed_by || row.reviewedBy || null,
    reviewedAt: row.reviewed_at || row.reviewedAt || null,
    rejectionReason: String(row.rejection_reason || row.rejectionReason || "").trim(),
    moderationNotes: row.moderation_notes != null ? String(row.moderation_notes) : "",
    publishedAt: row.published_at || row.publishedAt || null,
    isEdited: !!row.is_edited,
    viewerHasLiked: !!row.viewer_has_liked,
  };
}
