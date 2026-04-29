import { classifyPodcastUpload, sortByPublishedDesc } from "./episodeParser";

/**
 * @param {Array<Record<string, unknown>>} rawVideos
 * @returns {{ accepted: Array<Record<string, unknown> & { episode_number: number }>, rejected: Array<Record<string, unknown> & { reject_reason: string }> }}
 */
export function partitionEpisodesPipeline(rawVideos) {
  /** @type {any[]} */
  const accepted = [];
  /** @type {any[]} */
  const rejected = [];
  for (const row of rawVideos || []) {
    const c = classifyPodcastUpload(row);
    if (c.ok) {
      accepted.push({
        ...row,
        episode_number: c.episodeNumber,
        pipeline_decision: "accepted",
        pipeline_reason: "matched_rules",
      });
    } else {
      rejected.push({
        ...row,
        pipeline_decision: "rejected",
        pipeline_reason: c.reason,
        reject_reason: c.reason,
      });
    }
  }
  return { accepted, rejected };
}

/**
 * @param {Array<Record<string, unknown>>} accepted
 * @param {number} limit
 */
export function takeLatestAccepted(accepted, limit = 10) {
  return sortByPublishedDesc(accepted).slice(0, limit);
}
