import { YoutubeTranscript } from "youtube-transcript";

/**
 * @param {string} videoId
 * @returns {Promise<string>}
 */
export async function fetchTranscriptPlainText(videoId) {
  const raw = String(videoId || "").trim();
  if (!raw) return "";
  const parts = await YoutubeTranscript.fetchTranscript(raw);
  if (!Array.isArray(parts) || !parts.length) return "";
  return parts
    .map((p) => String(p?.text || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
