/**
 * Collapse whitespace for trusted canonical titles (do not change capitalization).
 */
export function normalizeOrganizationWhitespace(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if string has camelCase / PascalCase word joins (usually machine, not human-facing). */
export function looksLikeMachineJoinedName(value = "") {
  return /[a-z][A-Z]/.test(String(value || ""));
}

/** Directory / mapper placeholder — must not block reading real names from profile/org. */
export function isPlaceholderOrgName(value = "") {
  const t = String(value || "").trim();
  if (!t) return true;
  if (/^unknown organization$/i.test(t)) return true;
  if (/^trusted\s+resource$/i.test(t)) return true;
  if (/^proven\s+ally$/i.test(t)) return true;
  return false;
}

const COMMON_ORG_SUFFIX_PARTS = [
  "alliance",
  "association",
  "center",
  "centre",
  "coffee",
  "collective",
  "coalition",
  "community",
  "company",
  "council",
  "foundation",
  "group",
  "heroes",
  "house",
  "institute",
  "mission",
  "network",
  "outreach",
  "partners",
  "project",
  "program",
  "services",
  "society",
  "support",
  "treatment",
  "trust",
  "warrior",
  "warriors",
];

const LOWERCASE_CONNECTORS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "via",
]);

const KEEP_UPPERCASE_TOKENS = new Set([
  "USA",
  "US",
  "U.S.",
  "IRS",
  "PTA",
  "PTSA",
  "YMCA",
  "YWCA",
  "NAACP",
  "LGBTQ",
  "LGBTQIA",
  "NPO",
  "VFW",
  "AMVETS",
]);

function splitJoinedOrganizationToken(token = "") {
  const t = String(token || "").trim();
  if (!/^[a-z]+$/i.test(t)) return t;
  if (t.length < 12) return t;
  const low = t.toLowerCase();
  if (/[A-Z]/.test(t.slice(1)) && !/^[A-Z]+$/.test(t)) return t;

  for (const part of COMMON_ORG_SUFFIX_PARTS) {
    if (!low.endsWith(part)) continue;
    const root = low.slice(0, low.length - part.length);
    if (root.length < 4) continue;
    return `${root} ${part}`;
  }
  return t;
}

/**
 * Normalize organization strings for UI: human title case, word breaks, no camelCase slugs.
 * Prefer provenAllyRegistry `displayName` verbatim for curated allies — do not run this on those.
 */
export function formatOrganizationDisplayName(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let s = raw
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  s = s
    .split(" ")
    .map((token) => splitJoinedOrganizationToken(token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return s
    .split(" ")
    .map((token) => {
      if (!token) return "";
      if (/^\d+$/.test(token)) return token;
      const letters = token.replace(/[^a-zA-Z]/g, "");
      if (KEEP_UPPERCASE_TOKENS.has(token.toUpperCase())) return token.toUpperCase();
      const tokenLow = token.toLowerCase();
      if (LOWERCASE_CONNECTORS.has(tokenLow)) return tokenLow;
      if (letters.length <= 4 && /^[A-Z0-9&]+$/.test(token) && !LOWERCASE_CONNECTORS.has(tokenLow)) {
        return token.toUpperCase();
      }
      if (token.includes("&")) {
        return token
          .split("&")
          .map((p) => {
            const w = p.trim();
            if (!w) return w;
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
          })
          .join(" & ");
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Last-resort label from internal slug (registry `slug`); not a substitute for canonical displayName. */
export function humanizeProvenAllySlug(slug = "") {
  const raw = String(slug || "").trim();
  if (!raw) return "";
  return formatOrganizationDisplayName(raw.replace(/[-_]+/g, " "));
}

/** @deprecated Prefer humanizeProvenAllySlug — alias for Trusted Resources registry slugs */
export const humanizeTrustedResourceSlug = humanizeProvenAllySlug;
