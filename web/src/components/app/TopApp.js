"use client";

import { useMemo, useState } from "react";
import Container from "@/components/layout/Container";
import Avatar from "@/components/shared/Avatar";
import MembershipBadge from "@/components/shared/MembershipBadge";
import IconWrap from "@/components/shared/IconWrap";
import BrandMark from "@/components/BrandMark";
import AccountInfoCard from "@/features/profile/components/AccountInfoCard";
import MembershipUpgradeCard from "@/features/profile/components/MembershipUpgradeCard";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import ProvenAllyApplicationForm from "@/features/proven-allies/components/ProvenAllyApplicationForm";
import CommunityPage from "@/features/community/components/CommunityPage";
import SponsorHub from "@/features/sponsors/components/SponsorHub";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileQuickStats from "@/features/profile/components/ProfileQuickStats";
import SavedOrganizationsList from "@/features/profile/components/SavedOrganizationsList";
import { useDirectorySearch } from "@/hooks/useDirectorySearch";
import { useProfileData } from "@/features/profile/hooks";
import { useTrustedResources } from "@/hooks/useTrustedResources";
import { PODCAST_URL, SERVICE_OPTIONS, STATES } from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase/client";
import { rowEin } from "@/lib/utils";

function AppIcon({ name }) {
  const icons = {
    sponsors: "M4 6h16v12H4z M4 10h16",
    trusted: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z",
    community: "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6M3 19c0-2.8 2.8-4 5-4s5 1.2 5 4m3 0c0-2.4 2.3-3.5 5-3.5 2.1 0 5 1 5 3.5",
    podcast: "M12 4a6 6 0 0 1 6 6v4a2 2 0 0 1-4 0v-4a2 2 0 1 0-4 0v10a2 2 0 1 1-4 0V10a6 6 0 0 1 6-6",
    search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14m9 16-4-4",
    profile: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m-7 8c.5-3.5 3.5-5.5 7-5.5s6.5 2 7 5.5",
    contact: "M3 6h18v12H3z M3 7l9 7 9-7",
  };
  return <IconWrap path={icons[name] || icons.search} />;
}

export default function TopApp() {
  const sb = useMemo(() => getSupabaseClient(), []);
  const [nav, setNav] = useState("home");
  const [overlay, setOverlay] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const {
    userId,
    loadingProfile,
    profileError,
    profile,
    persistProfile,
    fullName,
    greetingName,
    isMember,
    favoriteEins,
    toggleFavoriteEin,
    savedOrganizations,
    setMembershipStatus,
    resetDemo,
  } = useProfileData(sb);
  const { filters, setFilters, results, status, meta, page, canGoNext, runSearch, clearSearch } = useDirectorySearch(sb);
  const { trusted, trustedStatus, loadTrusted } = useTrustedResources(sb);

  function openEdit() {
    setEditDraft(profile);
    setOverlay("edit");
  }

  async function fileToCompressedDataUrl(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (!dataUrl) return "";

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const maxSide = 720;
    const width = image.width || 1;
    const height = image.height || 1;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, targetW, targetH);
    return canvas.toDataURL("image/jpeg", 0.84);
  }

  async function onProfileImageSelected(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (!dataUrl) return;
      setEditDraft((d) => ({ ...d, avatarUrl: dataUrl }));
    } catch {
      // keep silent to avoid blocking edit flow
    }
  }

  function openSponsors() {
    if (!isMember) return setOverlay("upgrade");
    setNav("sponsors");
  }

  function openCommunity() {
    if (!isMember) return setOverlay("upgrade");
    setNav("community");
  }

  const membershipLabel = profile.membershipStatus === "member"
    ? "Member Active"
    : profile.membershipStatus === "demo"
      ? "Demo Member"
      : "Supporter Access";
  const membershipHint = isMember
    ? "You have full access to member-only areas and saved organizations."
    : profile.membershipStatus === "demo"
      ? "Demo mode enabled. Upgrade to activate full member benefits."
      : "Upgrade to unlock member-only sponsors, community access, and saved resources.";
  const fallbackSavedOrganizations = useMemo(() => {
    const byEin = new Map([...results, ...trusted].map((r) => [String(rowEin(r)), r]));
    return favoriteEins.map((ein) => byEin.get(String(ein)) || { ein, orgName: `Saved organization (${ein})`, city: "", state: "" });
  }, [favoriteEins, results, trusted]);
  const savedOrgsToRender = savedOrganizations.length ? savedOrganizations : fallbackSavedOrganizations;
  const isLoggedIn = !!String(profile.email || "").trim();

  return (
    <main className={`topApp theme-${profile.theme}`}>
      <header className="topbar">
        <Container className="topbarInner">
          <div className="topbarZone topbarLeft" aria-hidden="true">
            <button className="btnSoft sponsorBtnGhost" type="button" tabIndex={-1}>
              <AppIcon name="sponsors" />
              Become a Sponsor
            </button>
            {!isLoggedIn && (
              <button className="btnSoft sponsorBtnGhost" type="button" tabIndex={-1}>
                <AppIcon name="profile" />
                Sign In
              </button>
            )}
          </div>
          <div className="topbarZone topbarCenter">
            <div className="brandBlock">
              <BrandMark size="header" />
              <div className="brandTag">Veteran First Responder Resource Network</div>
            </div>
          </div>
          <div className="topbarZone topbarRight">
            <button className="btnSoft sponsorBtn" onClick={() => setNav("sponsors")} type="button">
              <AppIcon name="sponsors" />
              Become a Sponsor
            </button>
            {!isLoggedIn && (
              <button className="btnSoft sponsorBtn" onClick={() => setOverlay("signin")} type="button">
                <AppIcon name="profile" />
                Sign In
              </button>
            )}
          </div>
        </Container>
      </header>
      <div className="topbarOcclusion" aria-hidden="true" />

      {(nav === "home" || nav === "sponsors" || nav === "community") && (
        <section className="shell">
          {nav === "home" && (
            <>
              <div className="card cardHero">
                <div className="row space">
                  <div className="welcomePanel">
                    <Avatar src={profile.avatarUrl || "/assets/top_profile_circle_1024.png"} alt="Profile avatar" />
                    <div className="welcomeCopy">
                      <p className="introTagline">Welcome back</p>
                      <h2>{greetingName}</h2>
                      <MembershipBadge isMember={isMember} icon={<AppIcon name="profile" />} label={membershipLabel} />
                      <p>{membershipHint}</p>
                      <p>{favoriteEins.length} saved organizations</p>
                    </div>
                  </div>
                </div>
                <div className="row wrap">
                  <button className="btnSoft" type="button" onClick={() => { setNav("trusted"); loadTrusted(true); }}>
                    <AppIcon name="trusted" />
                    Open Proven Allies
                  </button>
                  <button className="btnSoft" type="button" onClick={openEdit}>
                    <AppIcon name="profile" />
                    Edit Profile
                  </button>
                  {!isMember && (
                    <button className="btnPrimary" type="button" onClick={() => setOverlay("upgrade")}>
                      Become a Member
                    </button>
                  )}
                </div>
              </div>

              <div className="grid4">
                <button className="card action" onClick={openSponsors} type="button"><AppIcon name="sponsors" />Sponsors {!isMember ? "🔒" : ""}</button>
                <button className="card action" onClick={() => { setNav("trusted"); loadTrusted(true); }} type="button"><AppIcon name="trusted" />Proven Allies</button>
                <button className="card action" onClick={openCommunity} type="button"><AppIcon name="community" />Community {!isMember ? "🔒" : ""}</button>
                <button className="card action" onClick={() => window.open(PODCAST_URL, "_blank", "noopener")} type="button"><AppIcon name="podcast" />Podcast</button>
              </div>

              <div className="card">
                <h3><AppIcon name="search" />Nonprofit Directory</h3>
                <div className="form">
                  <select value={filters.state} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}>
                    {STATES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                  <input placeholder="City or Organization" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
                  <select value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}>
                    {SERVICE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                  <select value={filters.audience} onChange={(e) => setFilters((f) => ({ ...f, audience: e.target.value }))}>
                    <option value="all">All</option>
                    <option value="veteran">Veterans</option>
                    <option value="first_responder">First Responders</option>
                  </select>
                </div>
                <div className="row">
                  <button className="btnPrimary" onClick={() => runSearch(1)} type="button">Search</button>
                  <button className="btnSoft" onClick={clearSearch} type="button">Clear</button>
                </div>
                <p>{status}</p>
                <p>{meta}</p>
                <div className="results">
                  {!results.length && !status && (
                    <div className="emptyState">
                      <AppIcon name="search" />
                      <div>
                        <strong>Start by selecting a state</strong>
                        <p>Use filters to quickly surface trusted support organizations.</p>
                      </div>
                    </div>
                  )}
                  {results.map((r) => {
                    const card = mapNonprofitCardRow(r, "directory");
                    const ein = card.ein;
                    return (
                      <NonprofitCard
                        key={`${ein}-${card.name}`}
                        card={card}
                        actionMode="directory"
                        isMember={isMember}
                        isFavorite={favoriteEins.includes(String(ein))}
                        onToggleFavorite={toggleFavoriteEin}
                      />
                    );
                  })}
                </div>
                <div className="row space">
                  <button className="btnSoft" disabled={page <= 1} onClick={() => runSearch(page - 1)} type="button">Prev</button>
                  <span>Page {page}</span>
                  <button className="btnSoft" disabled={!canGoNext} onClick={() => runSearch(page + 1)} type="button">Next</button>
                </div>
              </div>
            </>
          )}

          {nav === "sponsors" && (
            <SponsorHub supabase={sb} />
          )}

          {nav === "community" && (
            <CommunityPage
              supabase={sb}
              userId={userId}
              isMember={isMember}
              fullName={fullName}
              profile={profile}
              onRequestUpgrade={() => setOverlay("upgrade")}
            />
          )}
        </section>
      )}

      {nav === "trusted" && (
        <section className="shell">
          <div className="card">
            <h3><AppIcon name="trusted" />Proven Allies</h3>
            <p>Curated organizations with trusted alignment and mission-driven support.</p>
            <div className="row">
              <button className="btnPrimary" onClick={() => loadTrusted(true)} type="button">Refresh</button>
              <button className="btnSoft" onClick={() => loadTrusted(false)} type="button">Load More</button>
              <button className="btnSoft" onClick={() => setOverlay("applyProvenAlly")} type="button">Apply to Become a Proven Ally</button>
            </div>
            <p>{trustedStatus}</p>
            <div className="results">
              {!trusted.length && !trustedStatus && (
                <div className="emptyState">
                  <AppIcon name="trusted" />
                  <div>
                    <strong>No proven allies loaded yet</strong>
                    <p>Press Refresh to pull the latest verified organizations.</p>
                  </div>
                </div>
              )}
              {trusted.map((r) => {
                const card = mapNonprofitCardRow(r, "trusted");
                const ein = card.ein;
                return (
                  <NonprofitCard
                    key={`trusted-${ein}-${card.name}`}
                    card={card}
                    actionMode="proven"
                    isMember={isMember}
                    isFavorite={favoriteEins.includes(String(ein))}
                    onToggleFavorite={toggleFavoriteEin}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {nav === "profile" && (
        <section className="shell">
          <ProfileHeader
            avatarSrc={profile.avatarUrl || "/assets/top_profile_circle_1024.png"}
            fullName={fullName || "Josh Melching"}
            email={profile.email}
            bio={profile.banner}
            membershipLabel={membershipLabel}
            isMember={isMember}
            icon={<AppIcon name="profile" />}
            onEdit={openEdit}
          />

          {loadingProfile && (
            <div className="card">
              <p>Loading profile...</p>
            </div>
          )}
          {!!profileError && (
            <div className="card">
              <p>{profileError}</p>
            </div>
          )}

          <ProfileQuickStats savedCount={favoriteEins.length} membershipLabel={membershipLabel} />
          <AccountInfoCard
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            userId={userId}
          />
          <MembershipUpgradeCard
            isMember={isMember}
            onUpgrade={() => setOverlay("upgrade")}
          />
          <SavedOrganizationsList organizations={savedOrgsToRender} onToggleFavorite={toggleFavoriteEin} isMember={isMember} />
          <div className="card">
            <div className="row">
              <button className="btnSoft" onClick={() => setMembershipStatus("supporter")} type="button">Set Supporter</button>
              <button className="btnSoft" onClick={resetDemo} type="button">Reset Demo</button>
              <button className="btnSoft" onClick={() => setMembershipStatus("member")} type="button">Set Member</button>
            </div>
          </div>
        </section>
      )}

      {nav === "contact" && (
        <section className="shell">
          <div className="card">
            <h3><AppIcon name="contact" />Contact Us</h3>
            <p>If you are in immediate danger, call your local emergency number.</p>
            <p>In the U.S., call or text 988 for the Suicide & Crisis Lifeline.</p>
            <a className="btnPrimary" href="mailto:hello@theoutreach-project.com?subject=Need%20Help%20Finding%20Support">Email The Team</a>
          </div>
        </section>
      )}

      <footer className="siteFooter">
        <Container className="footerInner">
          <div>
            <div className="brandName">THE OUTREACH PROJECT</div>
            <p className="footerNote">Mission-first resource navigation for veterans, first responders, and supporters.</p>
          </div>
          <p className="footerNote">Trust-driven support, built for clarity under pressure.</p>
        </Container>
      </footer>

      <div className="footerDockBackdrop" aria-hidden="true" />
      <div className="footerDock">
        <Container className="footerNavInner">
          <nav className="bottomNav" aria-label="Primary navigation">
            <button className={`navItem ${nav === "home" ? "isActive" : ""}`} onClick={() => setNav("home")} type="button">Home</button>
            <button className={`navItem ${nav === "trusted" ? "isActive" : ""}`} onClick={() => { setNav("trusted"); if (!trusted.length) loadTrusted(true); }} type="button">Proven Allies</button>
            <button className={`navItem ${nav === "profile" ? "isActive" : ""}`} onClick={() => setNav("profile")} type="button">Profile</button>
            <button className={`navItem ${nav === "contact" ? "isActive" : ""}`} onClick={() => setNav("contact")} type="button">Contact</button>
          </nav>
        </Container>
      </div>

      {overlay === "upgrade" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Join The Outreach Project</h3>
            <p>Become a Member to unlock sponsor promos, community access, and saved organizations.</p>
            <div className="row">
              <button className="btnSoft" onClick={() => setOverlay(null)} type="button">Continue as Supporter</button>
              <button className="btnPrimary" onClick={async () => { await setMembershipStatus("member"); setOverlay(null); }} type="button">Become a Member</button>
            </div>
          </div>
        </div>
      )}

      {overlay === "edit" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <Avatar src={editDraft.avatarUrl || "/assets/top_profile_circle_1024.png"} alt="Profile preview" />
            <input value={editDraft.firstName || ""} onChange={(e) => setEditDraft((d) => ({ ...d, firstName: e.target.value }))} placeholder="First Name" />
            <input value={editDraft.lastName || ""} onChange={(e) => setEditDraft((d) => ({ ...d, lastName: e.target.value }))} placeholder="Last Name" />
            <input value={editDraft.email} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} placeholder="Email" />
            <input value={editDraft.banner} onChange={(e) => setEditDraft((d) => ({ ...d, banner: e.target.value }))} placeholder="Add Your Bio" />
            <input
              className="profileFileInput"
              type="file"
              accept="image/*"
              onChange={(e) => onProfileImageSelected(e.target.files?.[0])}
            />
            <div className="row">
              <button className="btnSoft" onClick={() => setOverlay(null)} type="button">Cancel</button>
              <button className="btnPrimary" onClick={async () => { await persistProfile({ ...profile, ...editDraft }); setOverlay(null); }} type="button">Save</button>
            </div>
          </div>
        </div>
      )}

      {overlay === "signin" && (
        <div className="modalOverlay" onClick={() => setOverlay(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Sign In</h3>
            <p>Authentication is coming next. For now, add your email in Edit Profile to personalize this demo account.</p>
            <div className="row">
              <button className="btnPrimary" onClick={() => { setNav("profile"); setOverlay("edit"); }} type="button">Open Edit Profile</button>
              <button className="btnSoft" onClick={() => setOverlay(null)} type="button">Close</button>
            </div>
          </div>
        </div>
      )}

      {overlay === "applyProvenAlly" && (
        <ProvenAllyApplicationForm
          supabase={sb}
          onClose={() => setOverlay(null)}
        />
      )}
    </main>
  );
}
