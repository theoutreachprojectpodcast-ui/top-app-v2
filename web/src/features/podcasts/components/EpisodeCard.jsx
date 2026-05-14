import {
  formatEpisodePostedAt,
  formatEpisodeViewCount,
  resolveEpisodeThumbnail,
  resolveEpisodeThumbnailFallback,
  resolveEpisodeWatchUrl,
} from "@/features/podcasts/api/podcastApi";
import { useState } from "react";

export default function EpisodeCard({ episode, guests = [] }) {
  const primaryThumbnail = resolveEpisodeThumbnail(episode);
  const fallbackThumbnail = resolveEpisodeThumbnailFallback(episode);
  const [thumbnail, setThumbnail] = useState(primaryThumbnail);
  const watchUrl = resolveEpisodeWatchUrl(episode);
  const needsLink = String(episode.episode_link_status || "").trim() === "needs_link";
  const summary = String(episode.description || "").replace(/\s+/g, " ").trim().slice(0, 180);
  return (
    <article className="podcastEpisodeCard">
      <div className="podcastEpisodeThumb">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            onError={() => {
              if (fallbackThumbnail && thumbnail !== fallbackThumbnail) setThumbnail(fallbackThumbnail);
            }}
          />
        ) : (
          <span>Episode</span>
        )}
      </div>
      <div className="podcastEpisodeBody">
        <h3>{episode.title}</h3>
        {needsLink ? (
          <p className="podcastEpisodeMeta podcastEpisodeMeta--pending" role="status">
            Episode link needed — not published until a matching YouTube full episode is verified.
          </p>
        ) : null}
        <p>{summary || "No description yet."}</p>
        {needsLink ? null : (
          <p className="podcastEpisodeMeta">{formatEpisodeViewCount(episode)} · {formatEpisodePostedAt(episode)}</p>
        )}
        {guests.length ? <p className="podcastEpisodeGuests">Guests: {guests.map((g) => g.name).join(", ")}</p> : null}
        {needsLink ? (
          <span className="btnSoft podcastEpisodeWatchBtn podcastEpisodeWatchBtn--disabled" aria-disabled="true">
            Episode link needed
          </span>
        ) : (
          <a className="btnSoft podcastEpisodeWatchBtn" href={watchUrl} target="_blank" rel="noopener noreferrer">
            Watch
          </a>
        )}
      </div>
    </article>
  );
}
