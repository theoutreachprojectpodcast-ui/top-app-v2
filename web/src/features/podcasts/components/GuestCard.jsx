import Link from "next/link";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";

export default function GuestCard({ guest, variant = "default" }) {
  const minimal = variant === "upcoming" || !!guest?.minimal;
  const voiceStrip = variant === "voiceStrip";
  const avatar = sanitizeDisplayableImageUrl(String(guest.avatar_url || "").trim());
  const unverified = !!guest.unverified && !minimal;
  const quote = String(guest.quote || "").replace(/\s+/g, " ").trim();
  const summary = String(guest.discussionSummary || "").replace(/\s+/g, " ").trim();
  const watchUrl = String(guest.episodeWatchUrl || "").trim();
  const slug = String(guest.slug || guest.id || "").trim();
  const guestDetailHref =
    !guest.upcoming && slug && !slug.startsWith("application-") ? `/podcasts/guests/${encodeURIComponent(slug)}` : null;

  const subtitle = String(guest.title || "").trim();
  const bodyText = quote || String(guest.bio || "").replace(/\s+/g, " ").trim();

  return (
    <article
      className={`podcastGuestCard${minimal ? " podcastGuestCard--minimal" : ""}${
        voiceStrip ? " podcastGuestCard--voiceStrip" : ""
      }`}
    >
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
        {unverified ? (
          <p className="podcastGuestUnverified">Unverified — editorial review pending before we publish full guest details.</p>
        ) : null}
        {!minimal && subtitle ? <p className="podcastGuestSubtitle">{subtitle}</p> : null}
        {minimal && subtitle ? <p className="podcastGuestSubtitle podcastGuestSubtitle--muted">{subtitle}</p> : null}
        {!minimal && bodyText ? <p className="podcastGuestQuote">{bodyText}</p> : null}
        {!minimal && summary && summary !== quote ? (
          <p className="podcastGuestDiscussion">
            {summary.slice(0, 200)}
            {summary.length > 200 ? "…" : ""}
          </p>
        ) : null}
        {!minimal && watchUrl ? (
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
