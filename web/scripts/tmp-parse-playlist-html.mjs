const pl = "PLxrmox4oWE7d-ZmMCc2lNkk4nXE8zKcKP";
const html = await fetch(`https://www.youtube.com/playlist?list=${pl}`, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; TOPPodcast/1.0)" },
}).then((r) => r.text());

function decodeJsonString(s) {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s.replace(/\\u0026/g, "&").replace(/\\"/g, '"');
  }
}

const videos = [];
const seen = new Set();
const re =
  /"playlistVideoRenderer"\s*:\s*\{[\s\S]*?"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"[\s\S]*?"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
let m;
while ((m = re.exec(html)) && videos.length < 30) {
  const id = m[1];
  if (seen.has(id)) continue;
  seen.add(id);
  videos.push({ id, title: decodeJsonString(m[2]) });
}
console.log(videos.length, videos.slice(0, 3));
