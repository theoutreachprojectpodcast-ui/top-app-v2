import Link from "next/link";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";

export default function GuestCard({ guest }) {
  const avatar = sanitizeDisplayableImageUrl(String(guest.avatar_url || "").trim());
  return (
    <Link className="podcastGuestCard" href={`/podcasts/guests/${encodeURIComponent(guest.slug || guest.id || "")}`}>
      <div className="podcastGuestAvatar">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={guest.name || "Podcast guest"} loading="lazy" />
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
