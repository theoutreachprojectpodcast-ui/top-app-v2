/**
 * Platform-wide organization / entity display titles for user-facing surfaces.
 *
 * Rules (card + profile primary titles):
 * - No EIN in the title slot
 * - No status labels (“Trusted Resource”, “Proven Ally”) as the title
 * - No raw slugs / snake_case as final output (humanized + title case)
 * - Registry / canonical display names are trusted verbatim (whitespace only)
 *
 * @module entityDisplayName
 */

import {
  formatOrganizationDisplayName,
  humanizeProvenAllySlug,
  isPlaceholderOrgName,
  looksLikeMachineJoinedName,
  normalizeOrganizationWhitespace,
} from "./formatOrgName.js";

/** @typedef {'card' | 'profile' | 'list' | 'metadata' | 'admin'} EntityTitleSlot */

const RE_EIN = /\b\d{2}[-\s]?\d{7}\b/;
const RE_PAREN_EIN = /\(\s*\d{2}[-\s]?\d{7}\s*\)/gi;
const RE_BRACKET_EIN = /[\[(]\s*ein\s*[:#]?\s*\d{2}[-\s]?\d{7}\s*[\])]/gi;
const RE_SUFFIX_EIN = /\s+ein\s*[:#]?\s*\d{2}[-\s]?\d{7}\s*$/i;
const RE_STATUS_TAIL = /\s*[—\-–]\s*(trusted\s+resource|proven\s+ally)\s*$/i;
const RE_GENERIC_PAREN = /\(\s*ein\s*[^)]*\)/gi;

/**
 * Remove EIN fragments and status junk often concatenated into a single “name” field.
 */
export function stripOrganizationTitleArtifacts(value = "") {
  let s = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  s = s.replace(RE_BRACKET_EIN, "");
  s = s.replace(RE_PAREN_EIN, "");
  s = s.replace(RE_GENERIC_PAREN, "");
  s = s.replace(RE_SUFFIX_EIN, "");
  s = s.replace(RE_STATUS_TAIL, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * True when the string is a status/label rather than an organization name.
 */
export function isBannedGenericOrganizationTitle(value = "") {
  const t = String(value || "").trim().toLowerCase();
  if (!t) return true;
  if (/^status\s*:/.test(t)) return true;
  if (/^trusted\s+resource\b/.test(t) || t === "trusted resource") return true;
  if (/^proven\s+ally\b/.test(t) || t === "proven ally") return true;
  if (t === "trusted resources") return true;
  if (t === "directory organization") return true;
  if (t === "unknown organization") return true;
  return false;
}

/**
 * Strip backend artifacts, then optionally apply title-style formatting.
 * @param {string} value
 * @param {{ trustCanonical?: boolean, skipFormatting?: boolean }} [opts]
 */
export function sanitizeOrganizationNameForDisplay(value = "", opts = {}) {
  const { trustCanonical = false, skipFormatting = false } = opts;
  const stripped = stripOrganizationTitleArtifacts(value);
  if (!stripped) return "";
  if (trustCanonical || skipFormatting) {
    return normalizeOrganizationWhitespace(stripped);
  }
  return formatOrganizationDisplayName(stripped);
}

function titleContainsEinPattern(title) {
  return RE_EIN.test(String(title || ""));
}

/**
 * Last-resort readable label from an official website URL (hostname segment only).
 */
export function titleHintFromWebsiteUrl(url = "") {
  let u = String(url || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const { hostname } = new URL(u);
    const dom = hostname.replace(/^www\./i, "").toLowerCase();
    if (!dom) return "";
    const first = dom.split(".")[0];
    if (first.length < 2 || /^\d+$/.test(first) || !/^[a-z0-9-]+$/i.test(first)) return "";
    const cleaned = first.replace(/-/g, " ");
    const titled = formatOrganizationDisplayName(cleaned);
    if (isBannedGenericOrganizationTitle(titled)) return "";
    return titled;
  } catch {
    return "";
  }
}

/**
 * Trusted Resources + directory cards: one resolver (canonical → linked fields → slug → website hint).
 */
export function resolveTrustedResourceDisplayName(params = {}) {
  return resolveOrganizationCardTitle({
    ...params,
    emptyFallback: params.emptyFallback ?? "Organization",
  });
}

/** Canonical organization-name resolver used by nonprofit + trusted cards and profile headers. */
export function resolveCanonicalOrganizationName(params = {}) {
  return resolveOrganizationCardTitle(params);
}

/**
 * Primary title for cards, profile headers, and list rows (organization entities).
 */
export function resolveOrganizationCardTitle(params = {}) {
  const {
    trustCanonical = false,
    canonicalDisplayName = "",
    candidateNames = [],
    provenAllySlug = "",
    trustedResourceSlug = "",
    websiteUrl = "",
    emptyFallback = "Organization",
  } = params;

  const slug = String(trustedResourceSlug || provenAllySlug || "").trim();

  if (trustCanonical && String(canonicalDisplayName).trim()) {
    const c = stripOrganizationTitleArtifacts(canonicalDisplayName);
    if (c && !titleContainsEinPattern(c)) {
      return normalizeOrganizationWhitespace(c);
    }
  }

  for (const raw of candidateNames) {
    const cleaned = sanitizeOrganizationNameForDisplay(raw, { trustCanonical: false });
    if (!cleaned || isPlaceholderOrgName(cleaned) || isBannedGenericOrganizationTitle(cleaned)) continue;
    if (titleContainsEinPattern(cleaned)) continue;
    return cleaned;
  }

  const slugTitle = slug ? humanizeProvenAllySlug(slug) : "";
  if (slugTitle && !isBannedGenericOrganizationTitle(slugTitle) && !titleContainsEinPattern(slugTitle)) {
    return slugTitle;
  }

  const hostTitle = titleHintFromWebsiteUrl(websiteUrl);
  if (hostTitle && !titleContainsEinPattern(hostTitle)) {
    return hostTitle;
  }

  return emptyFallback;
}

/** Sponsor / partner display line (curated data + safety net). */
export function resolveSponsorDisplayName(raw = "") {
  const cleaned = stripOrganizationTitleArtifacts(raw);
  if (!cleaned) return "";
  return formatOrganizationDisplayName(cleaned);
}

/**
 * QA / CI: flag strings that must not appear in a user-facing title slot.
 * @param {string} title
 * @param {{ slot?: EntityTitleSlot, allowShortAllCaps?: boolean }} [options]
 * @returns {{ code: string, message: string }[]}
 */
export function auditEntityTitleSlot(title, options = {}) {
  const { slot = "card", allowShortAllCaps = false } = options;
  const issues = [];
  const t = String(title || "").trim();
  if (!t) {
    issues.push({ code: "empty", message: "Title is empty" });
    return issues;
  }

  if (RE_EIN.test(t)) {
    issues.push({ code: "ein_in_title", message: "EIN pattern in title slot" });
  }
  if (/\(\s*ein\b/i.test(t)) {
    issues.push({ code: "ein_parenthetical", message: "Parenthetical EIN reference in title" });
  }

  const tl = t.toLowerCase();
  if (tl === "trusted resource" || /^trusted\s+resource\b/.test(tl)) {
    issues.push({ code: "status_as_title", message: "Trusted Resource used as title text" });
  }
  if (tl === "proven ally" || /^proven\s+ally\b/.test(tl)) {
    issues.push({ code: "status_as_title", message: "Proven Ally used as title text" });
  }
  if (/^status\s*:/.test(tl)) {
    issues.push({ code: "status_prefix", message: "Status prefix in title" });
  }

  if (/_/.test(t)) {
    issues.push({ code: "snake_case", message: "Underscores in title (raw slug?)" });
  }

  if (looksLikeMachineJoinedName(t)) {
    issues.push({ code: "camel_case_join", message: "camelCase / PascalCase word join" });
  }

  const letters = t.replace(/[^a-zA-Z]/g, "");
  if (!allowShortAllCaps && letters.length >= 10 && t === t.toUpperCase()) {
    issues.push({ code: "all_caps", message: "Long all-caps title (check intentional branding)" });
  }

  if ((slot === "card" || slot === "profile") && isBannedGenericOrganizationTitle(t)) {
    issues.push({ code: "generic_label_title", message: "Generic status/label used as organization title" });
  }

  return issues;
}

/** Curated registry titles are hand-approved; skip all-caps heuristic. */
export function auditRegistryDisplayName(record) {
  const dn = String(record?.displayName || "").trim();
  return auditEntityTitleSlot(dn, { slot: "card", allowShortAllCaps: true });
}
