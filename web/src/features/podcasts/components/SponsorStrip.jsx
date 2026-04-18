import Link from "next/link";

export default function SponsorStrip({ sponsors = [] }) {
  return (
    <section className="podcastSponsorStrip">
      <div className="podcastSponsorStripHead">
        <h3>Featured on the podcast</h3>
        <Link className="podcastSponsorStripCta" href="/podcasts?sponsor=1">
          Become a podcast sponsor
        </Link>
      </div>
      <p className="podcastMuted podcastSponsorStripLead">Organizations currently highlighted across podcast surfaces. Profile links open the main sponsor catalog.</p>
      <div className="podcastSponsorRow">
        {sponsors.map((sponsor) => (
          <Link key={sponsor.slug || sponsor.id} className="podcastSponsorPill" href={`/sponsors/${encodeURIComponent(sponsor.slug || sponsor.id)}`}>
            {sponsor.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
