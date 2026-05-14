/**
 * Sanity-check YouTube Data API v3 credentials for the podcast landing pipeline.
 * Loads `web/.env.local` when present (same pattern as `sync-podcast-youtube.mjs`).
 *
 * Usage: pnpm run verify:youtube-podcast
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

const key =
  String(process.env.YOUTUBE_API_KEY || "").trim() ||
  String(process.env.YOUTUBE_DATA_API_KEY || "").trim() ||
  String(process.env.GOOGLE_API_KEY || "").trim();

if (!key) {
  console.error(
    "[verify-youtube-podcast] Missing API key. Set one of (server-only, never NEXT_PUBLIC_*):\n" +
      "  YOUTUBE_API_KEY\n" +
      "  YOUTUBE_DATA_API_KEY\n" +
      "  GOOGLE_API_KEY\n" +
      "in web/.env.local (local) or your host env (Vercel → Project → Settings → Environment Variables).",
  );
  process.exit(1);
}

const { fetchOfficialPlaylistAcceptedEpisodes } = await import("../src/lib/podcast/fetchOfficialPlaylistAcceptedEpisodes.js");

const playlistId = String(process.env.YOUTUBE_FULL_EPISODES_PLAYLIST_ID || "PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP").trim();
console.log(`[verify-youtube-podcast] Using playlist ${playlistId.slice(0, 12)}… (override with YOUTUBE_FULL_EPISODES_PLAYLIST_ID)`);

const result = await fetchOfficialPlaylistAcceptedEpisodes({
  playlistId,
  maxPages: 2,
  maxAccepted: 8,
  excludeVideoIds: new Set(),
  forceIncludeVideoIds: new Set(),
});

if (!result.ok) {
  console.error("[verify-youtube-podcast] YouTube API call failed:", result.error || "unknown_error");
  process.exit(1);
}

const n = Array.isArray(result.videos) ? result.videos.length : 0;
console.log(`[verify-youtube-podcast] OK — ${n} accepted episode(s) from first page(s) (pipeline filters applied).`);
if (n) {
  for (const v of result.videos.slice(0, 3)) {
    const title = String(v?.title || "").slice(0, 72);
    console.log(`  - ${v?.youtube_video_id || "?"}  ${title}${title.length >= 72 ? "…" : ""}`);
  }
}
process.exit(0);
