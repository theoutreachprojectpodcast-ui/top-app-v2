/**
 * Shared community feed ordering — newest publish/review/create time first.
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

function feedRowId(row) {
  return String(row?.id || "");
}

/** @param {Record<string, unknown>[]} rows */
export function sortCommunityFeedRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const timeDelta = communityFeedSortTime(b) - communityFeedSortTime(a);
    if (timeDelta !== 0) return timeDelta;
    return feedRowId(b).localeCompare(feedRowId(a));
  });
}

/** Alias for mapped client posts (same sort keys). */
export const sortCommunityPosts = sortCommunityFeedRows;
