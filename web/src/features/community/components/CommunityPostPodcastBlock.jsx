"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommunityPostMedia from "@/features/community/components/CommunityPostMedia";

function episodeThumb(ep) {
  const id = String(ep?.youtube_video_id || ep?.video_id || "").trim();
  if (ep?.thumbnail_url) return String(ep.thumbnail_url);
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return "/home/home-podcast-mic.png";
}

/**
 * @param {{ title?: string }}
 */
export default function CommunityPostPodcastBlock({ title = "The Outreach Project Podcast" }) {
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/podcasts/recent", { credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list = Array.isArray(data?.episodes) ? data.episodes : [];
        if (list.length) {
          setEpisode(list[0]);
          setDegraded(!!data.degraded);
        } else {
          setDegraded(true);
        }
      } catch {
        if (!cancelled) setDegraded(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="communityPostPodcast communityPostPodcast--loading" aria-busy="true">
        <p className="communityPostPodcastStatus">Loading latest episode…</p>
      </div>
    );
  }

  if (!episode || degraded) {
    return (
      <div className="communityPostPodcast communityPostPodcast--placeholder">
        <CommunityPostMedia src="/home/home-podcast-mic.png" alt="Podcast" className="communityPostMedia--podcast" />
        <div className="communityPostPodcastCopy">
          <p className="communityPostPodcastEyebrow">Podcast</p>
          <h5 className="communityPostPodcastTitle">{title}</h5>
          <p className="communityPostPodcastDesc">
            Episode details load from our podcast feed. Open the podcast page to browse recent conversations.
          </p>
          <Link className="btnPrimary communityPostCta" href="/podcasts">
            Open podcast page
          </Link>
        </div>
      </div>
    );
  }

  const watchUrl =
    String(episode.youtube_url || "").trim() ||
    (episode.youtube_video_id ? `https://www.youtube.com/watch?v=${episode.youtube_video_id}` : "/podcasts");
  const epTitle = String(episode.title || "Latest episode").trim();

  return (
    <div className="communityPostPodcast">
      <CommunityPostMedia
        src={episodeThumb(episode)}
        alt={`Podcast episode: ${epTitle}`}
        className="communityPostMedia--podcast"
      />
      <div className="communityPostPodcastCopy">
        <p className="communityPostPodcastEyebrow">Latest episode</p>
        <h5 className="communityPostPodcastTitle">{epTitle}</h5>
        {episode.description ? (
          <p className="communityPostPodcastDesc">
            {String(episode.description).slice(0, 220)}
            {String(episode.description).length > 220 ? "…" : ""}
          </p>
        ) : null}
        <div className="communityPostPodcastActions">
          <a className="btnPrimary communityPostCta" href={watchUrl} target="_blank" rel="noopener noreferrer">
            Watch or listen
          </a>
          <Link className="btnSoft communityPostCta" href="/podcasts">
            All episodes
          </Link>
        </div>
      </div>
    </div>
  );
}
