export default function MemberOnlyLockSection({ canAccess, items = [] }) {
  return (
    <section className="podcastMemberSection">
      <h3>Members-Only Content</h3>
      {!canAccess ? (
        <div className="podcastLockCard">
          <strong>Locked for Pro members</strong>
          <p>
            Use the same Outreach Project account as the main app. Pro membership unlocks bonus episodes, extended
            interviews, and downloadable resources.
          </p>
          <div className="podcastLockCardActions">
            <a className="btnSoft" href="/api/auth/workos/signin?returnTo=/podcasts">
              Sign in
            </a>
            <a className="btnSoft" href="/profile">
              Profile &amp; membership
            </a>
          </div>
        </div>
      ) : (
        <div className="podcastMemberGrid">
          {items.map((item) => (
            <article key={item.id} className="podcastMemberItem">
              <h4>{item.title}</h4>
              <p>{item.summary || "Member-only content item."}</p>
              {item.content_url ? <a className="btnSoft" href={item.content_url} target="_blank" rel="noopener noreferrer">Open</a> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
