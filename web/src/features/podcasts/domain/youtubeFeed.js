const CHANNEL_HANDLE_URL = "https://www.youtube.com/@TheOutreachProjectHq";
const CHANNEL_USER = "TheOutreachProjectHq";

function clean(value) {
  return String(value ?? "").trim();
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function discoverChannelId() {
  try {
    const res = await fetch(CHANNEL_HANDLE_URL, { redirect: "follow" });
    if (!res.ok) return "";
    const html = await res.text();
    const idFromJson = html.match(/"channelId":"([^"]+)"/);
    if (clean(idFromJson?.[1])) return clean(idFromJson?.[1]);
    const idFromCanonical = html.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    return clean(idFromCanonical?.[1]);
  } catch {
    return "";
  }
}

export function youtubeFeedUrls(channelId = "") {
  const urls = [];
  const cleaned = clean(channelId);
  if (cleaned) urls.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(cleaned)}`);
  urls.push(`https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(CHANNEL_USER)}`);
  return urls;
}

export function parseYoutubeFeed(xmlText = "") {
  const xml = String(xmlText || "");
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.map((entry) => {
    const videoId = clean((entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]);
    const title = decodeXml(clean((entry.match(/<title>([^<]+)<\/title>/) || [])[1]));
    const published = clean((entry.match(/<published>([^<]+)<\/published>/) || [])[1]);
    const description = decodeXml(clean((entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1]));
    const thumb = clean((entry.match(/<media:thumbnail[^>]+url="([^"]+)"/) || [])[1]);
    const viewsRaw = clean((entry.match(/<media:statistics[^>]+views="([^"]+)"/) || [])[1]);
    const views = Number.parseInt(viewsRaw, 10);
    return {
      youtube_video_id: videoId,
      title,
      description,
      published_at: published || null,
      thumbnail_url: thumb || "",
      youtube_url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
      view_count: Number.isFinite(views) ? views : null,
    };
  }).filter((row) => row.youtube_video_id && row.title);
}
