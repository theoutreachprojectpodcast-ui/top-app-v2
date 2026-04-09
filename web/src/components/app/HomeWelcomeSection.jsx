"use client";

import IconWrap from "@/components/shared/IconWrap";

function AppIcon({ name }) {
  const icons = {
    trusted: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z",
    profile: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m-7 8c.5-3.5 3.5-5.5 7-5.5s6.5 2 7 5.5",
  };
  return <IconWrap path={icons[name] || icons.profile} />;
}

/**
 * Site-wide welcome for the Home hero (first section only). Intentionally avoids
 * personal profile data; detailed identity lives on the Profile tab.
 */
export default function HomeWelcomeSection({
  isAuthenticated,
  isMember,
  onOpenTrusted,
  onOpenMembershipJourney,
  onBrowseFree,
  onOpenProfile,
}) {
  return (
    <div className="homeWelcomeSection">
      <div className="homeWelcomeCopy">
        <p className="introTagline">The Outreach Project</p>
        <h2>Welcome — find trusted support, faster.</h2>
        <p className="homeWelcomeLead">
          {isAuthenticated
            ? "Explore the directory, trusted resources, sponsors, and community. Your account details and saved organizations stay in the Profile tab."
            : "Explore nonprofits, trusted resources, sponsors, and community. Create an account to save organizations and choose Support Membership ($5/mo) or Pro Membership ($10/mo) when you are ready."}
        </p>
      </div>
      <div className="row wrap homeWelcomeActions">
        <button className="btnSoft" type="button" onClick={onOpenTrusted}>
          <AppIcon name="trusted" />
          Open Trusted Resources
        </button>
        {!isAuthenticated ? (
          <>
            <button className="btnPrimary" type="button" onClick={onOpenMembershipJourney}>
              <AppIcon name="profile" />
              Join — account &amp; membership
            </button>
            <button className="btnSoft" type="button" onClick={onBrowseFree}>
              Browse nonprofits free
            </button>
          </>
        ) : (
          <>
            <button className="btnSoft" type="button" onClick={onOpenProfile}>
              <AppIcon name="profile" />
              Open Profile
            </button>
            {!isMember ? (
              <button className="btnPrimary" type="button" onClick={onOpenMembershipJourney}>
                Choose membership &amp; billing
              </button>
            ) : (
              <button className="btnSoft" type="button" onClick={onOpenProfile}>
                Manage membership
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
