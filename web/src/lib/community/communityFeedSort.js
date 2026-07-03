/**
 * Shared community feed ordering — member posts first (newest on top),
 * default Outreach moderator guides pinned to the bottom of the list.
 */

import { isCommunityModeratorFeedRow } from "@/features/community/domain/communityModerator";

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

function moderatorFeedRank(row) {
  return isCommunityModeratorFeedRow(row) ? 1 : 0;
}

/** @param {Record<string, unknown>[]} rows */
export function sortCommunityFeedRows(rows) {
  return [...(rows || [])].sort((a, b) => {
    const rankDelta = moderatorFeedRank(a) - moderatorFeedRank(b);
    if (rankDelta !== 0) return rankDelta;

    const timeDelta = communityFeedSortTime(b) - communityFeedSortTime(a);
    if (timeDelta !== 0) return timeDelta;
    return feedRowId(b).localeCompare(feedRowId(a));
  });
}

/** Alias for mapped client posts (same sort keys). */
export const sortCommunityPosts = sortCommunityFeedRows;
