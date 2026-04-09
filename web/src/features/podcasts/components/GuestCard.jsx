import Link from "next/link";

export default function GuestCard({ guest }) {
  return (
    <Link className="podcastGuestCard" href={`/podcasts/guests/${encodeURIComponent(guest.slug || guest.id || "")}`}>
      <div className="podcastGuestAvatar">
        {guest.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={guest.avatar_url} alt={guest.name || "Podcast guest"} loading="lazy" />
        ) : (
          <span>{String(guest.name || "G").slice(0, 1)}</span>
        )}
      </div>
      <div>
        <h3>{guest.name}</h3>
        <p>{guest.title || "Guest"}</p>
        <p>{guest.bio || "Guest profile coming soon."}</p>
      </div>
    </Link>
  );
}
