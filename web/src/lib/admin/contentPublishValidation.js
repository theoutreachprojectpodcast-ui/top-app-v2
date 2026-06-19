/**
 * Admin content publish safeguards — validate blocks before they go live (status=approved).
 */
import { PUBLIC_PAGE_CONTENT_STATUSES } from "@/lib/content/publicPageContentBlocks";

const IMAGE_URL_KEYS = ["logo_url", "header_image_url", "thumbnail_url"];
const URL_KEYS = [...IMAGE_URL_KEYS, "cta_link", "video_url"];

function isPublishStatus(status) {
  return PUBLIC_PAGE_CONTENT_STATUSES.includes(String(status || "").trim().toLowerCase());
}

/**
 * @param {string} raw
 * @returns {{ ok: true, url: string } | { ok: false, reason: string }}
 */
export function validateContentUrl(raw, { allowRelative = false } = {}) {
  const value = String(raw || "").trim();
  if (!value) return { ok: true, url: "" };
  if (allowRelative && value.startsWith("/") && !value.startsWith("//")) {
    return { ok: true, url: value };
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, reason: "unsupported_protocol" };
    }
    if (parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
      return { ok: false, reason: "https_required" };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

/**
 * @param {Record<string, unknown>} block
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateBlockForPublish(block) {
  const errors = [];
  const status = String(block?.status || "").trim();
  if (!isPublishStatus(status)) return { ok: true };

  const pageKey = String(block?.page_key || "").trim();
  if (!pageKey) errors.push("page_key_required");

  const title = String(block?.title || "").trim();
  const bodyHtml = String(block?.body_html || "").trim();
  const bodyText = String(block?.body_text || "").trim();
  if (!title && !bodyHtml && !bodyText) {
    errors.push("content_required_for_publish");
  }

  const metadata = block?.metadata && typeof block.metadata === "object" ? block.metadata : {};
  for (const key of URL_KEYS) {
    const raw = String(metadata[key] || "").trim();
    if (!raw) continue;
    const check = validateContentUrl(raw, { allowRelative: key === "cta_link" });
    if (!check.ok) errors.push(`invalid_${key}:${check.reason}`);
  }

  const blockType = String(block?.block_type || "").toLowerCase();
  if (blockType === "image_block" && !metadata.thumbnail_url && !bodyHtml) {
    errors.push("image_block_requires_thumbnail_or_body");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * Merge existing row + patch and validate if transitioning to approved.
 * @param {Record<string, unknown> | null} existing
 * @param {Record<string, unknown>} patch
 */
export function validateContentPublishTransition(existing, patch) {
  const nextStatus = patch.status !== undefined ? patch.status : existing?.status;
  if (!isPublishStatus(nextStatus)) return { ok: true };

  const merged = {
    ...(existing || {}),
    ...patch,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ...(patch.metadata && typeof patch.metadata === "object" ? patch.metadata : {}),
    },
    status: nextStatus,
  };
  return validateBlockForPublish(merged);
}
