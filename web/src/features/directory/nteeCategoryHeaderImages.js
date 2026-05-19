import { NTEE_MAJOR } from "@/lib/constants";

/** Same-origin NTEE major-category header art for directory cards and filters. */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const NTEE_CATEGORY_HEADER_IMAGE_URLS = Object.freeze(
  Object.fromEntries(
    LETTERS.map((letter) => [letter, `/directory/category-headers/${letter.toLowerCase()}.png`]),
  ),
);

/**
 * @param {string} nteeCode — full NTEE code or major letter
 * @returns {string}
 */
export function resolveNteeCategoryHeaderImageUrl(nteeCode) {
  const letter = String(nteeCode || "")
    .trim()
    .toUpperCase()
    .charAt(0);
  if (!letter || !NTEE_CATEGORY_HEADER_IMAGE_URLS[letter]) return "";
  return NTEE_CATEGORY_HEADER_IMAGE_URLS[letter];
}

/**
 * @param {string} letter — NTEE major letter
 * @returns {string}
 */
export function nteeMajorCategoryLabel(letter) {
  const key = String(letter || "").trim().toUpperCase();
  return NTEE_MAJOR[key] || "";
}
