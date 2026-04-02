"use client";

import { useEffect, useMemo, useState } from "react";
import HeaderInner from "@/components/layout/HeaderInner";
import FooterInner from "@/components/layout/FooterInner";
import Avatar from "@/components/shared/Avatar";
import BrandMark from "@/components/BrandMark";
import IconWrap from "@/components/shared/IconWrap";
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
import ProfileSummaryPanel from "@/features/profile/components/ProfileSummaryPanel";
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

export default function TopApp({ initialNav = "home" }) {
  const sb = useMemo(() => getSupabaseClient(), []);
  const [nav, setNav] = useState(initialNav);
  const [overlay, setOverlay] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [authDraft, setAuthDraft] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [contactDraft, setContactDraft] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [contactStatus, setContactStatus] = useState("");
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [nav]);

  const {
    userId,
    isAuthenticated,
    loadingProfile,
    profileError,
    profileSource,
    profile,
    persistProfile,
    fullName,
    greetingName,
    membership,
    isMember,
    favoriteEins,
    toggleFavoriteEin,
    savedOrganizations,
    setMembershipStatus,
    resetDemo,
    createAccount,
    signInWithEmail,
    signOut,
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
    setNav("sponsors");
  }

  function openCommunity() {
    setNav("community");
  }
  const fallbackSavedOrganizations = useMemo(() => {
    const byEin = new Map([...results, ...trusted].map((r) => [String(rowEin(r)), r]));
    return favoriteEins.map((ein) => byEin.get(String(ein)) || { ein, orgName: `Saved organization (${ein})`, city: "", state: "" });
  }, [favoriteEins, results, trusted]);
  const savedOrgsToRender = savedOrganizations.length ? savedOrganizations : fallbackSavedOrganizations;
  const isLoggedIn = isAuthenticated;

  async function onAuthSubmit() {
    setAuthError("");
    setAuthStatus("");
    const result = authMode === "signup"
      ? await createAccount(authDraft)
      : await signInWithEmail(authDraft.email);
    if (!result?.ok) {
      setAuthError(result?.message || "Unable to continue right now.");
      return;
    }
    setAuthStatus(authMode === "signup" ? "Account created. Welcome in." : "Signed in successfully.");
    setOverlay(null);
  }

  function onContactSubmit(e) {
    e.preventDefault();
    setContactError("");
    setContactStatus("");
    const required = ["firstName", "lastName", "email", "message"];
    for (const field of required) {
      if (!String(contactDraft[field] || "").trim()) {
        setContactError("Please complete all required fields.");
        return;
      }
    }
    const subject = encodeURIComponent(`Contact Request — ${contactDraft.firstName} ${contactDraft.lastName}`);
    const body = encodeURIComponent(
      `Name: ${contactDraft.firstName} ${contactDraft.lastName}\nEmail: ${contactDraft.email}\nPhone: ${contactDraft.phone || "Not provided"}\n\nMessage:\n${contactDraft.message}`
    );
    window.location.href = `mailto:hello@theoutreach-project.com?subject=${subject}&body=${body}`;
    setContactStatus("Your email draft is ready to send.");
  }

  return (
    <main className={`topApp theme-${profile.theme}`}>
      <BrandMark size="header" />
      <header className="topbar">
        <HeaderInner className="topbarInner">
          <div className="topbarZone topbarLeft" aria-hidden="true" />
          <div className="topbarZone topbarCenter">
            <div className="headerBrandCopy">
              <p className="headerBrandSubtitle">Veteran First Responder Resource Network</p>
            </div>
          </div>
          <div className="topbarZone topbarRight">
            <div className="topbarActionsCluster">
              <button className="btnSoft sponsorBtn" onClick={() => setNav("sponsors")} type="button">
                <AppIcon name="sponsors" />
                Become a Sponsor
              </button>
              {!isLoggedIn && (
                <button className="btnSoft sponsorBtn" onClick={() => { setAuthMode("signin"); setOverlay("signin"); }} type="button">
                  <AppIcon name="profile" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </HeaderInner>
      </header>
      <div className="topbarOcclusion" aria-hidden="true" />

      {(nav === "home" || nav === "sponsors" || nav === "community") && (
        <section className="shell">
          {nav === "home" && (
            <>
              <div className="card cardHero">
                <div className="row space">
                  {isAuthenticated ? (
                    <ProfileSummaryPanel
                      avatarSrc={profile.avatarUrl}
                      greetingName={greetingName}
                      isMember={isMember}
                      membershipLabel={membership.label}
                      membershipHint={membership.hint}
                      savedCount={favoriteEins.length}
                      icon={<AppIcon name="profile" />}
                    />
                  ) : (
                    <div className="guestWelcomePanel">
                      <p className="introTagline">Welcome</p>
                      <h2>Find trusted support, faster.</h2>
                      <p>Explore nonprofits, proven allies, sponsors, and community stories. Create an account to save resources and personalize your journey.</p>
                    </div>
                  )}
                </div>
                <div className="row wrap">
                  <button className="btnSoft" type="button" onClick={() => { setNav("trusted"); loadTrusted(true); }}>
                    <AppIcon name="trusted" />
                    Open Proven Allies
                  </button>
                  {isAuthenticated ? (
                    <button className="btnSoft" type="button" onClick={openEdit}>
                      <AppIcon name="profile" />
                      Edit Profile
                    </button>
                  ) : (
                    <button className="btnSoft" type="button" onClick={() => { setAuthMode("signup"); setOverlay("signin"); }}>
                      <AppIcon name="profile" />
                      Create Account
                    </button>
                  )}
                  {!isMember && isAuthenticated && (
                    <button className="btnPrimary" type="button" onClick={() => setOverlay("upgrade")}>
                      Become a Member
                    </button>
                  )}
                  {!isAuthenticated && (
                    <button className="btnPrimary" type="button" onClick={() => { setAuthMode("signup"); setOverlay("signin"); }}>
                      Become a Supporter
                    </button>
                  )}
                </div>
              </div>

              <div className="grid4">
                <button className="card action" onClick={openSponsors} type="button"><AppIcon name="sponsors" />Sponsors</button>
                <button className="card action" onClick={() => { setNav("trusted"); loadTrusted(true); }} type="button"><AppIcon name="trusted" />Proven Allies</button>
                <button className="card action" onClick={openCommunity} type="button"><AppIcon name="community" />Community</button>
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
              onRequestUpgrade={() => {
                if (!isAuthenticated) {
                  setAuthMode("signup");
                  setOverlay("signin");
                  return;
                }
                setOverlay("upgrade");
              }}
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
          {!isAuthenticated ? (
            <div className="card">
              <h3><AppIcon name="profile" />Create your account</h3>
              <p>Set up your profile to save organizations, personalize support pathways, and unlock member-ready features.</p>
              <div className="row wrap">
                <button className="btnPrimary" type="button" onClick={() => { setAuthMode("signup"); setOverlay("signin"); }}>Start onboarding</button>
                <button className="btnSoft" type="button" onClick={() => setNav("home")}>Back to home</button>
              </div>
            </div>
          ) : (
            <>
          <ProfileHeader
            avatarSrc={profile.avatarUrl || "/assets/top_profile_circle_1024.png"}
            fullName={fullName || "Supporter"}
            email={profile.email}
            bio={profile.banner}
            membershipLabel={membership.label}
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

          <ProfileQuickStats savedCount={favoriteEins.length} membershipLabel={membership.label} />
          <AccountInfoCard
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            userId={userId}
            profileSource={profileSource}
          />
          <MembershipUpgradeCard
            isMember={isMember}
            membershipLabel={membership.label}
            membershipHint={membership.hint}
            onUpgrade={() => setOverlay("upgrade")}
          />
          <SavedOrganizationsList organizations={savedOrgsToRender} onToggleFavorite={toggleFavoriteEin} isMember={isMember} />
          <div className="card">
            <div className="row">
              <button className="btnSoft" onClick={() => setMembershipStatus("supporter")} type="button">Set Supporter</button>
              <button className="btnSoft" onClick={resetDemo} type="button">Reset Demo</button>
              <button className="btnSoft" onClick={() => setMembershipStatus("member")} type="button">Set Member</button>
              <button className="btnSoft" onClick={signOut} type="button">Sign Out</button>
            </div>
          </div>
            </>
          )}
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
          <div className="card">
            <h3>Send us a message</h3>
            <form className="contactForm" onSubmit={onContactSubmit}>
              <div className="form">
                <input placeholder="First Name *" value={contactDraft.firstName} onChange={(e) => setContactDraft((d) => ({ ...d, firstName: e.target.value }))} />
                <input placeholder="Last Name *" value={contactDraft.lastName} onChange={(e) => setContactDraft((d) => ({ ...d, lastName: e.target.value }))} />
                <input placeholder="Email *" type="email" value={contactDraft.email} onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))} />
                <input placeholder="Phone Number" value={contactDraft.phone} onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))} />
              </div>
              <textarea rows={6} placeholder="Message *" value={contactDraft.message} onChange={(e) => setContactDraft((d) => ({ ...d, message: e.target.value }))} />
              {contactError ? <p className="applyError">{contactError}</p> : null}
              {contactStatus ? <p className="applyStatus">{contactStatus}</p> : null}
              <div className="row wrap">
                <button className="btnPrimary" type="submit">Submit Message</button>
              </div>
            </form>
          </div>
        </section>
      )}

      <footer className="siteFooter">
        <FooterInner className="footerInner">
          <div>
            <div className="brandName">THE OUTREACH PROJECT</div>
            <p className="footerNote">Mission-first resource navigation for veterans, first responders, and supporters.</p>
          </div>
          <p className="footerNote">Trust-driven support, built for clarity under pressure.</p>
        </FooterInner>
      </footer>

      <div className="footerDockBackdrop" aria-hidden="true" />
      <div className="footerDock">
        <FooterInner className="footerNavInner">
          <nav className="bottomNav" aria-label="Primary navigation">
            <button className={`navItem ${nav === "home" ? "isActive" : ""}`} onClick={() => setNav("home")} type="button">Home</button>
            <button className={`navItem ${nav === "trusted" ? "isActive" : ""}`} onClick={() => { setNav("trusted"); if (!trusted.length) loadTrusted(true); }} type="button">Proven Allies</button>
            <button className={`navItem ${nav === "community" ? "isActive" : ""}`} onClick={() => setNav("community")} type="button">Community</button>
            <button className={`navItem ${nav === "profile" ? "isActive" : ""}`} onClick={() => setNav("profile")} type="button">Profile</button>
            <button className={`navItem ${nav === "contact" ? "isActive" : ""}`} onClick={() => setNav("contact")} type="button">Contact</button>
          </nav>
        </FooterInner>
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
            <h3>{authMode === "signup" ? "Create account" : "Sign in"}</h3>
            <p>{authMode === "signup" ? "Start with a simple supporter account. You can upgrade to Member anytime." : "Use your email to continue in this demo experience."}</p>
            {authMode === "signup" && (
              <>
                <input value={authDraft.firstName} onChange={(e) => setAuthDraft((d) => ({ ...d, firstName: e.target.value }))} placeholder="First Name" />
                <input value={authDraft.lastName} onChange={(e) => setAuthDraft((d) => ({ ...d, lastName: e.target.value }))} placeholder="Last Name" />
              </>
            )}
            <input value={authDraft.email} onChange={(e) => setAuthDraft((d) => ({ ...d, email: e.target.value }))} placeholder="Email" type="email" />
            {authMode === "signup" && (
              <input value={authDraft.password} onChange={(e) => setAuthDraft((d) => ({ ...d, password: e.target.value }))} placeholder="Password" type="password" />
            )}
            {authError ? <p className="applyError">{authError}</p> : null}
            {authStatus ? <p className="applyStatus">{authStatus}</p> : null}
            <div className="row">
              <button className="btnPrimary" onClick={onAuthSubmit} type="button">{authMode === "signup" ? "Create Account" : "Sign In"}</button>
              <button className="btnSoft" onClick={() => setAuthMode((m) => (m === "signup" ? "signin" : "signup"))} type="button">
                {authMode === "signup" ? "I already have an account" : "Create an account"}
              </button>
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
