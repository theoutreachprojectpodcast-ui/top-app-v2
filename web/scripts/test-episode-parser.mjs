import { classifyPodcastUpload, extractEpisodeNumberFromText } from "../src/lib/podcast/episodeParser.js";

const cases = [
  { title: "Episode 12: Service leadership with Jane Doe", expect: true },
  { title: "Ep. 3 — Community rebuild", expect: true },
  { title: "Quick teaser for next week", expect: false },
  { title: "Highlight reel from Episode 9", expect: false },
  { title: "Random vlog with no number", expect: false },
];

let failed = 0;
for (const c of cases) {
  const ep = extractEpisodeNumberFromText(c.title);
  const r = classifyPodcastUpload({
    youtube_video_id: "testid12345",
    title: c.title,
    description: "",
    youtube_url: "https://www.youtube.com/watch?v=testid12345",
    duration_seconds: 900,
  });
  const ok = r.ok === c.expect;
  if (!ok) {
    console.error("FAIL", c.title, "expected", c.expect, "got", r);
    failed += 1;
  }
}
if (failed) process.exit(1);
console.log("episodeParser smoke OK:", cases.length, "cases");
