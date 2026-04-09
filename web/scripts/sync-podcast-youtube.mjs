import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { discoverChannelId, parseYoutubeFeed, youtubeFeedUrls } from "../src/features/podcasts/domain/youtubeFeed.js";

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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE = "podcast_episodes";

if (!URL || !KEY) {
  console.warn("Skipping podcast sync: missing Supabase credentials.");
  process.exit(0);
}

const channelId = await discoverChannelId();
let rows = [];
for (const feedUrl of youtubeFeedUrls(channelId)) {
  const feed = await fetch(feedUrl);
  if (!feed.ok) continue;
  rows = parseYoutubeFeed(await feed.text()).slice(0, 120);
  if (rows.length) break;
}
if (!rows.length) {
  console.warn("Skipping podcast sync: unable to load YouTube feed.");
  process.exit(0);
}
const supabase = createClient(URL, KEY);
const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "youtube_video_id" });
if (error) {
  if (String(error.message || "").includes(TABLE)) {
    console.warn("Skipping podcast sync: podcast_episodes table missing. Apply web/supabase/podcasts.sql first.");
    process.exit(0);
  }
  console.error(error.message);
  process.exit(1);
}

console.log(`Podcast episodes synced: ${rows.length}`);
