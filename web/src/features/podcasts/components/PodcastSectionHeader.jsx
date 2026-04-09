export default function PodcastSectionHeader({ eyebrow, title, subtitle }) {
  return (
    <header>
      {eyebrow ? <p className="podcastEyebrow">{eyebrow}</p> : null}
      <h2 className="podcastSectionTitle">{title}</h2>
      {subtitle ? <p className="podcastSectionSubtitle">{subtitle}</p> : null}
    </header>
  );
}
