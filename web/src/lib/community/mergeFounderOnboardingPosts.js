import { buildFounderOnboardingPostRows } from "@/features/community/data/founderOnboardingPosts";
import { mapCommunityPostRow } from "@/features/community/mappers/mapCommunityPost";

const FOUNDER_ROWS = buildFounderOnboardingPostRows();

const FOUNDER_MAPPED = FOUNDER_ROWS.map(mapCommunityPostRow).filter(Boolean);

function postSortKey(row) {
  const raw = row?.created_at ?? row?.createdAt ?? "";
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Merge canonical Josh/Hodge moderator guides into a public feed (DB-shaped rows).
 * @param {Record<string, unknown>[]} rows
 */
export function mergeFounderOnboardingPostRows(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    if (!row?.id) continue;
    byId.set(String(row.id), row);
  }
  for (const founder of FOUNDER_ROWS) {
    byId.set(String(founder.id), founder);
  }
  return Array.from(byId.values()).sort((a, b) => postSortKey(b) - postSortKey(a));
}

/**
 * Merge canonical moderator guides into mapped client feed posts.
 * @param {ReturnType<typeof mapCommunityPostRow>[]} posts
 */
export function mergeFounderOnboardingPosts(posts) {
  const byId = new Map();
  for (const row of posts || []) {
    if (!row?.id) continue;
    byId.set(row.id, row);
  }
  for (const founder of FOUNDER_MAPPED) {
    byId.set(founder.id, founder);
  }
  return Array.from(byId.values()).sort(
    (a, b) => postSortKey(b) - postSortKey(a),
  );
}

export function founderOnboardingPostCount() {
  return FOUNDER_MAPPED.length;
}
