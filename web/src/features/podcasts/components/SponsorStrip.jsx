import Link from "next/link";

export default function SponsorStrip({ sponsors = [] }) {
  return (
    <section className="podcastSponsorStrip">
      <h3>Podcast Sponsors</h3>
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
