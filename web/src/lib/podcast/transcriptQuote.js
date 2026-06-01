/**
 * Pick a short, guest-flavored line from captions.
 */
export function extractGuestVoiceQuote(transcriptPlain, guestNameHint, maxLen = 160) {
  const raw = String(transcriptPlain || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";

  const hint = String(guestNameHint || "").trim();
  const firstTok = hint.split(/\s+/)[0] || "";
  const safeHint = firstTok.length >= 2 && hint !== "Guest" ? firstTok : "";

  const chunks = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const sentences = [];
  for (const c of chunks) {
    if (c.length < 28 || c.length > 320) continue;
    if (/\bhttp\b/i.test(c)) continue;
    if (/^\d+[.:]\d+/.test(c)) continue;
    sentences.push(c);
  }
  if (!sentences.length) {
    const fallback = raw.slice(0, Math.min(maxLen + 40, raw.length));
    return fallback.length > maxLen ? `${fallback.slice(0, maxLen - 1)}…` : fallback;
  }

  const midStart = Math.floor(sentences.length * 0.2);
  const pool = sentences.slice(midStart);

  let pick = "";
  if (safeHint) {
    const re = new RegExp(`\\b${escapeRegExp(safeHint)}\\b`, "i");
    pick = pool.find((s) => re.test(s)) || sentences.find((s) => re.test(s)) || "";
  }
  if (!pick) pick = pool[0] || sentences[Math.min(2, sentences.length - 1)] || sentences[0];

  const one = String(pick || "").replace(/^[\s"'“”]+|[\s"'“”]+$/g, "").trim();
  if (!one) return "";
  if (one.length <= maxLen) return one;
  return `${one.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
