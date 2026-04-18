/**
 * Community story media — forward-compatible shape for Supabase Storage / CDN attachments.
 * Use these field names when extending `community_posts` (or related) table.
 *
 * Suggested future columns (optional, nullable):
 * - cover_image_storage_path text  (e.g. bucket/key)
 * - cover_image_public_url text     (signed or public CDN URL)
 * - attachment_mime_type text
 * - attachment_byte_size int
 * - attachment_upload_status text   ('pending' | 'ready' | 'failed')
 */

/** @typedef {{ storagePath?: string|null, publicUrl?: string|null, mimeType?: string|null, byteSize?: number|null, uploadStatus?: string|null }} StoryMediaAttachment */

/**
 * Normalizes client-side draft (e.g. data URL) into payload for API — server replaces with storage refs later.
 * @param {{ dataUrl?: string, fileName?: string }} raw
 * @returns {StoryMediaAttachment & { inlineDataUrl?: string }}
 */
export function normalizeStoryMediaDraftForSubmit(raw = {}) {
  const dataUrl = String(raw.dataUrl || "").trim();
  return {
    storagePath: null,
    publicUrl: null,
    mimeType: dataUrl.startsWith("data:image/") ? dataUrl.split(";")[0].replace("data:", "") : null,
    byteSize: null,
    uploadStatus: dataUrl ? "inline_pending_upload" : null,
    inlineDataUrl: dataUrl || undefined,
  };
}
