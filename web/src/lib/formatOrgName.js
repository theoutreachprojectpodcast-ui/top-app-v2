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
  return !t || /^unknown organization$/i.test(t);
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

  return s
    .split(" ")
    .map((token) => {
      if (!token) return "";
      if (/^\d+$/.test(token)) return token;
      const letters = token.replace(/[^a-zA-Z]/g, "");
      if (letters.length <= 4 && /^[A-Z0-9&]+$/.test(token)) return token.toUpperCase();
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
