const pl = "PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP";
const res = await fetch(`https://www.youtube.com/playlist?list=${pl}`, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; TOPPodcast/1.0)" },
});
const t = await res.text();
const ids = [...t.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
const uniq = [...new Set(ids)];
console.log("status", res.status, "ids", uniq.length, uniq.slice(0, 8));
