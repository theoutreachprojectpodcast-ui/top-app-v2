/**
 * Shared community feed ordering — pinned first, then newest publish/review/create time.
 */

export function communityFeedSortTime(row) {
  const raw =
    row?.published_at ||
    row?.publishedAt ||
    row?.reviewed_at ||
    row?.reviewedAt ||
    row?.created_at ||
    row?.createdAt ||
    "";
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** @param {Record<string, unknown>[]} rows */
export function sortCommunityFeedRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const pinA = a?.is_pinned || a?.isPinned ? 1 : 0;
    const pinB = b?.is_pinned || b?.isPinned ? 1 : 0;
    if (pinB !== pinA) return pinB - pinA;
    return communityFeedSortTime(b) - communityFeedSortTime(a);
  });
}

/** Alias for mapped client posts (same sort keys). */
export const sortCommunityPosts = sortCommunityFeedRows;
