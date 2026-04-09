export default function MemberOnlyLockSection({ canAccess, items = [] }) {
  return (
    <section className="podcastMemberSection">
      <h3>Members-Only Content</h3>
      {!canAccess ? (
        <div className="podcastLockCard">
          <strong>Locked for members</strong>
          <p>Sign in as a member to unlock bonus episodes, extended interviews, and downloadable resources.</p>
          <a className="btnSoft" href="/profile">Sign in or upgrade membership</a>
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
