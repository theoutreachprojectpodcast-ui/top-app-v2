const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const GIF = [0x47, 0x49, 0x46];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

/** @type {Record<string, { mime: string, ext: string, match: (buf: Buffer) => boolean }>} */
const IMAGE_TYPES = {
  "image/jpeg": {
    mime: "image/jpeg",
    ext: "jpg",
    match: (buf) => buf.length >= 3 && JPEG.every((b, i) => buf[i] === b),
  },
  "image/png": {
    mime: "image/png",
    ext: "png",
    match: (buf) => buf.length >= 4 && PNG.every((b, i) => buf[i] === b),
  },
  "image/gif": {
    mime: "image/gif",
    ext: "gif",
    match: (buf) => buf.length >= 3 && GIF.every((b, i) => buf[i] === b),
  },
  "image/webp": {
    mime: "image/webp",
    ext: "webp",
    match: (buf) =>
      buf.length >= 12 &&
      WEBP_RIFF.every((b, i) => buf[i] === b) &&
      WEBP_MAGIC.every((b, i) => buf[i + 8] === b),
  },
};

export const DEFAULT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Validate image upload bytes and declared MIME type.
 * @param {File} file
 * @param {{ maxBytes?: number, allowedMime?: Set<string> }} [opts]
 */
export async function validateImageUpload(file, opts = {}) {
  const maxBytes = opts.maxBytes ?? DEFAULT_IMAGE_MAX_BYTES;
  const allowedMime = opts.allowedMime ?? new Set(Object.keys(IMAGE_TYPES));

  if (!file || typeof file === "string") {
    return { ok: false, status: 400, error: "missing_file" };
  }
  if (file.size <= 0) {
    return { ok: false, status: 400, error: "empty_file" };
  }
  if (file.size > maxBytes) {
    return { ok: false, status: 400, error: "file_too_large" };
  }

  const declared = String(file.type || "").toLowerCase();
  if (!allowedMime.has(declared)) {
    return { ok: false, status: 400, error: "unsupported_type" };
  }
  const spec = IMAGE_TYPES[declared];
  if (!spec) {
    return { ok: false, status: 400, error: "unsupported_type" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!spec.match(buffer)) {
    return { ok: false, status: 400, error: "content_type_mismatch" };
  }

  return {
    ok: true,
    buffer,
    mime: spec.mime,
    ext: spec.ext,
  };
}

/**
 * Build a safe storage object path (no traversal, restricted charset).
 * @param {string} prefix e.g. workos user id
 * @param {string} ext
 */
export function safeUploadObjectPath(prefix, ext) {
  const safePrefix = String(prefix || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 128);
  const safeExt = String(ext || "bin")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8);
  return `${safePrefix}/${Date.now()}.${safeExt}`;
}
