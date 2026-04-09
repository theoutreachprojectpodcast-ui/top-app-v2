import PodcastsLandingPage from "@/features/podcasts/components/PodcastsLandingPage";
import { discoverChannelId, parseYoutubeFeed, youtubeFeedUrls } from "@/features/podcasts/domain/youtubeFeed";

export default async function PodcastsPageRoute() {
  let initialEpisodes = [];
  try {
    const channelId = await discoverChannelId();
    for (const feedUrl of youtubeFeedUrls(channelId)) {
      const res = await fetch(feedUrl, { cache: "no-store" });
      if (!res.ok) continue;
      const xml = await res.text();
      initialEpisodes = parseYoutubeFeed(xml).slice(0, 10);
      if (initialEpisodes.length) break;
    }
  } catch {
    initialEpisodes = [];
  }
  return <PodcastsLandingPage initialEpisodes={initialEpisodes} />;
}
