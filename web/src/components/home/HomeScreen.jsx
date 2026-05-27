"use client";

import HomeProfileProgressNotice from "@/components/app/HomeProfileProgressNotice";
import HomeSponsorBannerPlacements from "@/components/app/HomeSponsorBannerPlacements";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import HomeAuthCards from "@/components/home/HomeAuthCards";
import HomeDirectoryPanel from "@/components/home/HomeDirectoryPanel";
import HomeFeatureCards from "@/components/home/HomeFeatureCards";
import HomeMembershipBar from "@/components/home/HomeMembershipBar";
import "@/components/home/home-mobile.css";

export default function HomeScreen({
  isAuthenticated,
  isMember,
  fullName,
  email,
  avatarUrl,
  membershipLabel,
  showHomeProfileHeroNotice,
  profileCompletion,
  onActivateMembership,
  onOpenProfile,
  onOpenProfileEdit,
  onOpenOnboarding,
  onOpenMembership,
  onCreateAccount,
  onSignIn,
  onSponsors,
  onTrusted,
  onCommunity,
  onPodcasts,
  directoryProps,
  favoriteEinSet,
  onToggleFavorite,
  onRequestSignIn,
}) {
  return (
    <>
      <div className="homeMobile">
        <HomeSponsorBannerPlacements />

        <HomeMembershipBar
          isAuthenticated={isAuthenticated}
          isMember={isMember}
          fullName={fullName}
          email={email}
          avatarUrl={avatarUrl}
          membershipLabel={membershipLabel}
          onActivateMembership={onActivateMembership}
          onOpenProfile={onOpenProfile}
        />

        {!isAuthenticated ? (
          <HomeAuthCards onCreateAccount={onCreateAccount} onSignIn={onSignIn} />
        ) : null}

        {showHomeProfileHeroNotice ? (
          <div className="homeMobile__profileNotice">
            <HomeProfileProgressNotice
              completion={profileCompletion}
              onOpenProfile={onOpenProfileEdit || onOpenProfile}
              onOpenOnboarding={onOpenOnboarding}
              onOpenMembership={onOpenMembership}
            />
          </div>
        ) : null}

        <HomeFeatureCards
          onSponsors={onSponsors}
          onTrusted={onTrusted}
          onCommunity={onCommunity}
          onPodcasts={onPodcasts}
        />

        <HomeDirectoryPanel
          {...directoryProps}
          isAuthenticated={isAuthenticated}
          favoriteEinSet={favoriteEinSet}
          onToggleFavorite={onToggleFavorite}
          onRequestSignIn={onRequestSignIn}
        />

        <div className="homeMobile__missionStrip">
          <MissionPageTopStrip placement="bottom" />
        </div>
      </div>
    </>
  );
}
