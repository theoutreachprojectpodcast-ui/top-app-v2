/**
 * Heuristic guest extraction from episode title/description (no external “research” APIs).
 * Public copy is written to read like human editorial — not raw YouTube metadata dumps.
 */

function stripUrls(text = "") {
  return String(text || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNoise(text = "") {
  return stripUrls(text)
    .replace(/#\w+/g, "")
    .replace(/\b(?:subscribe|follow us|chapters?:)\b[^.]*\.?/gi, "")
    .trim();
}

function shortenTopic(raw, max = 72) {
  const t = stripNoise(raw).replace(/^[\s\-–—|]+/, "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {string} title
 * @param {string} description
 * @returns {{ guestName: string, organization: string, roleTitle: string, shortBio: string, discussionSummary: string, confidence: number, sourceUrls: string[] }}
 */
export function extractGuestHeuristic(title = "", description = "") {
  const t = String(title || "").trim();
  const d = stripNoise(String(description || ""));
  const sourceUrls = [];

  let guestName = "";
  let organization = "";
  let roleTitle = "";
  let confidence = 0.28;

  const strippedTitle = t.replace(/^\s*(?:podcast\s+)?(?:ep\.?|episode)\s*#?\s*\d+\s*[:|\-–]\s*/i, "").trim();
  let topicSegment = strippedTitle.split(/\s*[|—–]\s*/)[0].trim() || strippedTitle;

  const withMatch = strippedTitle.match(/\bwith\s+([^|—–]+)/i);
  const featMatch = strippedTitle.match(/\b(?:feat\.?|ft\.?)\s+([^|—–]+)/i);
  const pipeParts = strippedTitle.split("|").map((s) => s.trim()).filter(Boolean);

  if (featMatch?.[1]) {
    guestName = featMatch[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    confidence = 0.66;
  } else if (withMatch?.[1]) {
    guestName = withMatch[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    confidence = 0.58;
  } else if (pipeParts.length >= 2) {
    guestName = pipeParts[pipeParts.length - 1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    confidence = 0.5;
  }

  const wordCount = (s) => (String(s || "").trim().match(/\S+/g) || []).length;
  if (!guestName || wordCount(guestName) > 6 || guestName.length > 48) {
    const paren = strippedTitle.match(/\(([^)]+)\)\s*$/);
    if (paren?.[1]) {
      organization = paren[1].trim();
      guestName = strippedTitle.replace(/\s*\([^)]+\)\s*$/, "").trim();
      confidence = 0.45;
    } else {
      const parts = topicSegment.split(/\s+[—–-]\s+/);
      const last = parts.length > 1 ? parts[parts.length - 1].trim() : "";
      if (last && wordCount(last) <= 5 && last.length <= 44) {
        guestName = last;
        topicSegment = parts.slice(0, -1).join(" — ").trim() || topicSegment;
        confidence = 0.4;
      } else {
        guestName = "";
      }
    }
  }

  const firstLine = d.split("\n").map((l) => l.trim()).find(Boolean) || "";
  const atOrg = firstLine.match(/^([^,|]+),\s*([^|]+?)\s+at\s+(.+)$/i);
  if (atOrg) {
    const maybeName = atOrg[1].trim();
    if (!guestName || guestName.length < 2) guestName = maybeName;
    roleTitle = atOrg[2].trim();
    organization = organization || atOrg[3].trim();
    confidence = Math.min(0.86, confidence + 0.18);
  } else {
    const parenOrg = t.match(/\(([^)]+)\)\s*$/);
    if (parenOrg?.[1] && !organization) {
      organization = parenOrg[1].trim();
      confidence = Math.min(0.78, confidence + 0.06);
    }
  }

  guestName = guestName.replace(/^["']+|["']+$/g, "").trim();
  if (guestName.length > 80) guestName = guestName.slice(0, 77).trim() + "…";

  const topicShort = shortenTopic(topicSegment, 64);
  const orgFrag = organization ? ` (${organization})` : "";

  const shortBio =
    organization && guestName
      ? `${guestName}${orgFrag} joined the podcast for a conversation about service and community.`
      : guestName
        ? `${guestName} joined The Outreach Project podcast to share perspective on mission-driven work.`
        : "Guest details will appear here after the editorial team confirms the episode listing.";

  const discussionSummary =
    guestName && topicShort
      ? `Host and team welcome ${guestName}${organization ? ` from ${organization}` : ""} to discuss ${topicShort.charAt(0).toLowerCase()}${topicShort.slice(1)}.`
      : topicShort
        ? `This episode focuses on ${topicShort.charAt(0).toLowerCase()}${topicShort.slice(1)}.`
        : "Episode summary will be published after a quick editorial pass.";

  return {
    guestName: guestName || "Guest",
    organization,
    roleTitle,
    shortBio,
    discussionSummary,
    confidence: Math.min(1, Math.max(0, confidence)),
    sourceUrls,
  };
}
