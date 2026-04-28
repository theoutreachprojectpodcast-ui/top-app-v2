import { discoverChannelId, parseYoutubeFeed, youtubeFeedUrls } from "@/features/podcasts/domain/youtubeFeed";

export async function GET() {
  const channelId = await discoverChannelId();
  for (const feedUrl of youtubeFeedUrls(channelId)) {
    const res = await fetch(feedUrl, { redirect: "follow", cache: "no-store" });
    if (!res.ok) continue;
    const xml = await res.text();
    const episodes = parseYoutubeFeed(xml).slice(0, 10);
    if (episodes.length) return Response.json({ ok: true, episodes });
  }
  return Response.json({ error: "Unable to load YouTube feed." }, { status: 500 });
}
