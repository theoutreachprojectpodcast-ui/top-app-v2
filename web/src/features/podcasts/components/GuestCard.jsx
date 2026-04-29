import Link from "next/link";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";

export default function GuestCard({ guest }) {
  const avatar = sanitizeDisplayableImageUrl(String(guest.avatar_url || "").trim());
  const unverified = !!guest.unverified;
  const summary = String(guest.discussionSummary || "").replace(/\s+/g, " ").trim();
  const watchUrl = String(guest.episodeWatchUrl || "").trim();
  const slug = String(guest.slug || guest.id || "").trim();
  const guestDetailHref =
    !guest.upcoming && slug && !slug.startsWith("application-") ? `/podcasts/guests/${encodeURIComponent(slug)}` : null;

  return (
    <article className="podcastGuestCard">
      <div className="podcastGuestAvatar">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={guest.name || "Podcast guest"} loading="lazy" />
        ) : (
          <span>{String(guest.name || "G").slice(0, 1)}</span>
        )}
      </div>
      <div className="podcastGuestCard__body">
        {guestDetailHref ? (
          <h3>
            <Link href={guestDetailHref} className="podcastGuestCard__titleLink">
              {guest.name}
            </Link>
          </h3>
        ) : (
          <h3>{guest.name}</h3>
        )}
        {unverified ? <p className="podcastGuestUnverified">Unverified — from episode title or description until editorial review.</p> : null}
        <p>{guest.title || "Guest"}</p>
        <p>{guest.bio || "Guest profile coming soon."}</p>
        {summary ? (
          <p className="podcastGuestDiscussion">
            {summary.slice(0, 200)}
            {summary.length > 200 ? "…" : ""}
          </p>
        ) : null}
        {watchUrl ? (
          <p className="podcastGuestWatchWrap">
            <a className="podcastGuestWatch" href={watchUrl} target="_blank" rel="noopener noreferrer">
              Watch episode
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}
