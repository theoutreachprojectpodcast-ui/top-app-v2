import { nameAlignmentScore } from "@/features/nonprofits/verification/verifyEnrichment";

const SOCIAL_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "linkedin.com",
  "www.linkedin.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "youtube.com",
  "www.youtube.com",
  "tiktok.com",
  "www.tiktok.com",
]);

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * High bar: search snippets may only supplement copy when they clearly refer to this nonprofit.
 * Prefer results whose link hostname matches the official site.
 */
export function verifyPublicSearchCandidate({ canonicalName, officialHostname }, candidate) {
  if (!candidate?.snippet || candidate.snippet.length < 45) return false;
  if (!String(canonicalName || "").trim()) return false;

  const titleScore = nameAlignmentScore(canonicalName, candidate.title);
  const snippetScore = nameAlignmentScore(canonicalName, candidate.snippet);
  const blend = Math.max(titleScore * 0.45 + snippetScore * 0.55, snippetScore);

  const linkHost = hostOf(candidate.link);
  if (!linkHost) return false;
  if (SOCIAL_HOSTS.has(linkHost)) return false;

  const official = String(officialHostname || "")
    .replace(/^www\./i, "")
    .toLowerCase();
  if (official) {
    if (linkHost === official || linkHost.endsWith(`.${official}`) || official.endsWith(`.${linkHost}`)) {
      return blend >= 0.38;
    }
  }

  return blend >= 0.58;
}
