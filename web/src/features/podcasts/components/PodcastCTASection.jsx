export default function PodcastCTASection({ onApply }) {
  return (
    <section className="podcastCtaSection">
      <h3>Stay connected to new episodes</h3>
      <p>Subscribe on YouTube and follow The Outreach Project Podcast for new releases and guest highlights.</p>
      <div className="row wrap">
        <a className="btnPrimary" href="https://www.youtube.com/@TheOutreachProjectHq" target="_blank" rel="noopener noreferrer">
          Watch Episodes
        </a>
        <span className="btnSoft" aria-disabled="true">Members Only Content — Coming Soon</span>
        <button className="btnSoft" type="button" onClick={onApply}>Apply to Be on the Podcast</button>
      </div>
    </section>
  );
}
