"use client";

/**
 * @param {string} url
 */
function youtubeEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/^\//, "").split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

export default function CommunityPostVideoBlock({ url, title }) {
  const embed = youtubeEmbedUrl(url);
  if (embed) {
    return (
      <div className="communityPostVideoEmbed">
        <iframe
          src={embed}
          title={title || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (!url) return null;
  return (
    <a className="communityPostVideoLink btnSoft" href={url} target="_blank" rel="noopener noreferrer">
      Watch video
    </a>
  );
}
