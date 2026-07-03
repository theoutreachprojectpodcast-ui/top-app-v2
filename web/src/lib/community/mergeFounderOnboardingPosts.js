import { sortCommunityFeedRows } from "@/lib/community/communityFeedSort";

/**
 * Public feed rows only — no client-side injection of starter content.
 * @param {Record<string, unknown>[]} rows
 */
export function mergeFounderOnboardingPostRows(rows) {
  return sortCommunityFeedRows(rows || []);
}

/**
 * Mapped client feed posts only — no hard-coded moderator guides merged at runtime.
 * @param {import("@/features/community/mappers/mapCommunityPost").CommunityPostRow[]} posts
 */
export function mergeFounderOnboardingPosts(posts) {
  return sortCommunityFeedRows(posts || []);
}

/** @deprecated Starter posts are no longer injected into the live feed. */
export function founderOnboardingPostCount() {
  return 0;
}
