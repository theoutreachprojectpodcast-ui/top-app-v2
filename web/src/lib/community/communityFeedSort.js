/**
 * Shared community feed ordering —
 * 1) From your connections (boosted)
 * 2) Other member community posts
 * 3) Moderator / platform guides at the bottom
 * Within each band: newest first.
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

function friendFeedRank(row) {
  return row?.from_connection || row?.fromConnection ? 0 : 1;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {{ chronological?: boolean }} [opts]
 */
export function sortCommunityFeedRows(rows, opts = {}) {
  const chronological = !!opts.chronological;
  return [...(rows || [])].sort((a, b) => {
    if (!chronological) {
      const friendDelta = friendFeedRank(a) - friendFeedRank(b);
      if (friendDelta !== 0) return friendDelta;

      const rankDelta = moderatorFeedRank(a) - moderatorFeedRank(b);
      if (rankDelta !== 0) return rankDelta;
    }

    const timeDelta = communityFeedSortTime(b) - communityFeedSortTime(a);
    if (timeDelta !== 0) return timeDelta;
    return feedRowId(b).localeCompare(feedRowId(a));
  });
}

/** Alias for mapped client posts (same sort keys). */
export const sortCommunityPosts = sortCommunityFeedRows;
