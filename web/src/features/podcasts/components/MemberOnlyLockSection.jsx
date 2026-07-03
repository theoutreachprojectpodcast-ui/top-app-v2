import Link from "next/link";
import { workosSignInLink } from "@/lib/auth/workosReturnTo";

export default function MemberOnlyLockSection({ canAccess, items = [] }) {
  return (
    <section className="podcastMemberSection">
      <h3>Pro-exclusive content</h3>
      {!canAccess ? (
        <div className="podcastLockCard">
          <strong>Locked for Pro members</strong>
          <p>
            Pro membership unlocks bonus episodes, extended interviews, and downloadable resources delivered through our
            members-only YouTube playlist integration.
          </p>
          <div className="podcastLockCardActions">
            <a className="btnSoft" href={workosSignInLink("/podcasts", null, "/podcasts")}>
              Sign in
            </a>
            <Link className="btnSoft" href="/profile">
              Profile &amp; membership
            </Link>
          </div>
        </div>
      ) : (
        <div className="podcastMemberGrid">
          {items.map((item) => (
            <article key={item.id} className="podcastMemberItem">
              <h4>{item.title}</h4>
              <p>{item.summary || "Pro-exclusive content item."}</p>
              {item.content_url ? (
                <a className="btnSoft" href={item.content_url} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
