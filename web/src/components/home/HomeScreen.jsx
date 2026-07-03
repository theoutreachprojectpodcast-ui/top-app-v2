"use client";

import HomeSponsorBannerPlacements from "@/components/app/HomeSponsorBannerPlacements";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import HomeAuthCards from "@/components/home/HomeAuthCards";
import HomeDirectoryPanel from "@/components/home/HomeDirectoryPanel";
import HomeFeatureCards from "@/components/home/HomeFeatureCards";
import HomeMembershipBar from "@/components/home/HomeMembershipBar";
import "@/components/home/home-mobile.css";

export default function HomeScreen({
  isAuthenticated,
  loadingAccount = false,
  currentTierKey = "none",
  accountEmail = "",
  membershipLabel = "",
  membershipBillingStatus = "none",
  onActivateMembership,
  onCreateAccount,
  onSignIn,
  onSponsors,
  onTrusted,
  onCommunity,
  onPodcasts,
  onProUpgrade,
  hasProAccess = true,
  directoryProps,
  favoriteEinSet,
  onToggleFavorite,
  onRequestSignIn,
  onGoToProfile,
  showMembershipSection = true,
}) {
  return (
    <>
      <div className="homeMobile">
        <HomeSponsorBannerPlacements />

        {!isAuthenticated ? (
          <HomeMembershipBar onActivateMembership={onActivateMembership} />
        ) : null}

        {!isAuthenticated ? (
          <HomeAuthCards onCreateAccount={onCreateAccount} onSignIn={onSignIn} />
        ) : null}

        <HomeFeatureCards
          onSponsors={onSponsors}
          onTrusted={onTrusted}
          onCommunity={onCommunity}
          onPodcasts={onPodcasts}
          onProUpgrade={onProUpgrade}
          hasProAccess={hasProAccess}
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
