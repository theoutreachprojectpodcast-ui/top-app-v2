/**
 * IRS classification interpretation for The Outreach Project directory import.
 *
 * Requested label "5019a" is NOT a valid IRS exempt-organization code.
 * Given TOP's veteran/military focus and EO BMF coding, we interpret it as:
 *   IRC §501(c)(19) — posts/organizations of past or present members of the
 *   U.S. Armed Forces (and auxiliaries / related trusts).
 *
 * In the IRS Exempt Organizations Business Master File (EO BMF):
 *   SUBSECTION = "19"  →  501(c)(19)
 *   CLASSIFICATION typically "1" → "Post or Organization of War Veterans"
 *
 * Related (not default) codes:
 *   SUBSECTION "23" → 501(c)(23) veterans associations formed prior to 1880
 *   FOUNDATION codes under 501(c)(3) may reference 509(a)(1)/(2)/(3) — that is
 *   a different concept (public charity vs private foundation), not "5019a".
 *
 * Official source:
 *   https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf
 *   https://www.irs.gov/pub/irs-soi/eo-info.pdf
 */

export const IRS_CLASSIFICATION_INTERPRETATION = {
  requestedLabel: "5019a",
  isValidIrsCode: false,
  interpretedAs: "501(c)(19)",
  eoBmfSubsection: "19",
  ircReference: "26 U.S.C. § 501(c)(19)",
  description:
    "Veterans' organizations: posts or organizations of past or present members of the Armed Forces of the United States, auxiliaries, or related trusts/foundations.",
  rejectedAlternatives: [
    {
      code: "509(a)",
      reason: "Classifies 501(c)(3) public charities vs private foundations (foundation code), not a subsection label like 5019a.",
    },
    {
      code: "501(c)(9)",
      reason: "VEBA; EO BMF subsection 09 — unrelated to the truncated '5019a' form.",
    },
  ],
  relatedOptionalSubsections: ["23"],
};

export const DEFAULT_SUBSECTION_FILTER = "19";

export const DEDUCTIBILITY_LABELS = {
  "1": "Contributions are deductible",
  "2": "Contributions are not deductible",
  "4": "Contributions deductible by treaty (foreign organizations)",
};

export const SUBSECTION_LABELS = {
  "19": "501(c)(19) — Veterans' organization",
  "23": "501(c)(23) — Veterans association (pre-1880)",
  "03": "501(c)(3) — Charitable organization",
};

export function normalizeSubsectionCode(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return raw;
  // EO BMF uses 2-digit subsection codes (03, 19, …).
  return String(n).padStart(2, "0");
}

export function subsectionLabel(code) {
  const n = normalizeSubsectionCode(code);
  return SUBSECTION_LABELS[n] || `501(c)(${n || "?"})`;
}

export function deductibilityLabel(code) {
  const c = String(code ?? "").trim();
  return DEDUCTIBILITY_LABELS[c] || (c ? `Deductibility code ${c}` : null);
}

export function tagsForSubsection(subsection) {
  const n = normalizeSubsectionCode(subsection);
  if (n === "19" || n === "23") {
    return {
      category_tags: ["veterans", "military", "nonprofit", "irs_exempt"],
      audience_tags: ["veteran", "military", "family", "support"],
      serves_veterans: true,
      serves_first_responders: false,
    };
  }
  return {
    category_tags: ["nonprofit", "irs_exempt"],
    audience_tags: [],
    serves_veterans: false,
    serves_first_responders: false,
  };
}

export function formatRulingDate(ruling) {
  const raw = String(ruling ?? "").trim();
  if (!raw) return null;
  // EO BMF RULING is YYYYMM
  if (/^\d{6}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

export function classificationSummary() {
  return IRS_CLASSIFICATION_INTERPRETATION;
}
