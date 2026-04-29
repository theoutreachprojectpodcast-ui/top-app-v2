import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { runPodcastYouTubeSync } from "../src/lib/podcast/runPodcastYouTubeSync.js";

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

if (!URL || !KEY) {
  console.warn("Skipping podcast sync: missing Supabase credentials.");
  process.exit(0);
}

const supabase = createClient(URL, KEY);
const result = await runPodcastYouTubeSync(supabase);
if (!result.ok) {
  console.error(result.error || "sync_failed");
  process.exit(1);
}

console.log(`Podcast pipeline sync OK: ${result.synced} rows (source: ${result.source}, featured rows: ${result.featured})`);
