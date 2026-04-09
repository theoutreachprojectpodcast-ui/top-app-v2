import PodcastSectionHeader from "@/features/podcasts/components/PodcastSectionHeader";

export default function PodcastHero({ featured, onApply }) {
  return (
    <section className="podcastHeroCard">
      <PodcastSectionHeader
        eyebrow="The Outreach Project Podcast"
        title="Stories of service, resilience, and impact"
        subtitle="Media-forward conversations from veterans, first responders, nonprofit leaders, and mission-driven partners."
      />
      <div className="podcastHeroMeta">
        <p><strong>Featured:</strong> {featured?.title || "Latest episode from channel"}</p>
        <div className="row wrap">
          <a className="btnPrimary" href={featured?.youtube_url || "https://www.youtube.com/@TheOutreachProjectHq"} target="_blank" rel="noopener noreferrer">
            Watch on YouTube
          </a>
          <button className="btnSoft" type="button" onClick={onApply}>Apply to Be a Guest</button>
        </div>
      </div>
    </section>
  );
}
