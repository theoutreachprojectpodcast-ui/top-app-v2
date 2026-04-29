/**
 * Heuristic guest extraction from episode title/description (no external “research” APIs).
 * Returns conservative confidence; admins verify before treating as fact on the public site.
 */

/**
 * @param {string} title
 * @param {string} description
 * @returns {{ guestName: string, organization: string, roleTitle: string, shortBio: string, discussionSummary: string, confidence: number, sourceUrls: string[] }}
 */
export function extractGuestHeuristic(title = "", description = "") {
  const t = String(title || "").trim();
  const d = String(description || "").replace(/\s+/g, " ").trim();
  const sourceUrls = [];

  let guestName = "";
  let organization = "";
  let roleTitle = "";
  let confidence = 0.25;

  // Strip leading "Episode N:" / "Ep N:" prefix
  const strippedTitle = t.replace(/^\s*(?:podcast\s+)?(?:ep\.?|episode)\s*#?\s*\d+\s*[:|\-–]\s*/i, "").trim();

  const withMatch = strippedTitle.match(/\bwith\s+([^|]+)/i);
  const featMatch = strippedTitle.match(/\b(?:feat\.?|ft\.?)\s+([^|]+)/i);
  const pipeParts = strippedTitle.split("|").map((s) => s.trim()).filter(Boolean);

  if (featMatch?.[1]) {
    guestName = featMatch[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    confidence = 0.62;
  } else if (withMatch?.[1]) {
    guestName = withMatch[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    confidence = 0.55;
  } else if (pipeParts.length >= 2) {
    guestName = pipeParts[pipeParts.length - 1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    confidence = 0.48;
  } else {
    guestName = strippedTitle.slice(0, 72).trim();
    confidence = 0.32;
  }

  // "Name, Title at Organization" in first line of description
  const firstLine = d.split("\n").map((l) => l.trim()).find(Boolean) || "";
  const atOrg = firstLine.match(/^([^,|]+),\s*([^|]+?)\s+at\s+(.+)$/i);
  if (atOrg) {
    if (!guestName || guestName.length < 3) guestName = atOrg[1].trim();
    roleTitle = atOrg[2].trim();
    organization = atOrg[3].trim();
    confidence = Math.min(0.85, confidence + 0.2);
  } else {
    const parenOrg = t.match(/\(([^)]+)\)\s*$/);
    if (parenOrg?.[1] && !organization) {
      organization = parenOrg[1].trim();
      confidence = Math.min(0.78, confidence + 0.08);
    }
  }

  guestName = guestName.replace(/^["']+|["']+$/g, "").trim();
  if (guestName.length > 120) guestName = guestName.slice(0, 117) + "…";

  const shortBio =
    organization && guestName
      ? `${guestName} is associated with ${organization}. Details are being reviewed by the editorial team.`
      : guestName
        ? `${guestName} joined The Outreach Project podcast. Details are being reviewed by the editorial team.`
        : "Guest details are being reviewed by the editorial team.";

  const discussionSummary =
    d.length > 40
      ? `${d.slice(0, 220).trim()}${d.length > 220 ? "…" : ""}`
      : "Discussion summary will be added after editorial review.";

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
