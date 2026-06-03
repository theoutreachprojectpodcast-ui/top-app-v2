"use client";

import HomeSponsorBannerPlacements from "@/components/app/HomeSponsorBannerPlacements";
import MissionPageTopStrip from "@/components/layout/MissionPageTopStrip";
import HomeAuthCards from "@/components/home/HomeAuthCards";
import HomeDirectoryPanel from "@/components/home/HomeDirectoryPanel";
import HomeFeatureCards from "@/components/home/HomeFeatureCards";
import HomeMembershipBar from "@/components/home/HomeMembershipBar";
import HomeMembershipSection from "@/components/home/HomeMembershipSection";
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
  onUpgradeTier,
  onJoinFree,
  directoryProps,
  favoriteEinSet,
  onToggleFavorite,
  onRequestSignIn,
  onGoToProfile,
}) {
  return (
    <>
      <div className="homeMobile">
        <HomeSponsorBannerPlacements />

        {!isAuthenticated ? (
          <HomeMembershipBar onActivateMembership={onActivateMembership} />
        ) : null}

        <HomeMembershipSection
          isAuthenticated={isAuthenticated}
          loadingAccount={loadingAccount}
          currentTierKey={currentTierKey}
          accountEmail={accountEmail}
          membershipLabel={membershipLabel}
          membershipBillingStatus={membershipBillingStatus}
          onRequestSignIn={onRequestSignIn || onSignIn}
          onJoinFree={onJoinFree || onActivateMembership}
          onUpgradeTier={onUpgradeTier}
          onGoToProfile={onGoToProfile}
        />

        {!isAuthenticated ? (
          <HomeAuthCards onCreateAccount={onCreateAccount} onSignIn={onSignIn} />
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
