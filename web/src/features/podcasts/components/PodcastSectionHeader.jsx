export default function PodcastSectionHeader({ eyebrow, title, subtitle, titleId }) {
  return (
    <header>
      {eyebrow ? <p className="podcastEyebrow">{eyebrow}</p> : null}
      <h2 id={titleId} className="podcastSectionTitle">
        {title}
      </h2>
      {subtitle ? <p className="podcastSectionSubtitle">{subtitle}</p> : null}
    </header>
  );
}
