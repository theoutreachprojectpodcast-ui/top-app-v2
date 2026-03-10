/* ===============================
   THE OUTREACH PROJECT — APP LOGIC (V3 / 4-NAV) — FINAL STABLE BUILD
   - Stable statewide search
   - 100 results per page
   - Safe total count query
   - Audience filter is ACTIVE again
   - Trusted loads via fast path
   - Favorites are MEMBER ONLY
   - Saved Organizations are MEMBER ONLY
   - Demo membership flow included
   - Sticky search meta + cached exact totals
   =============================== */

const SUPABASE_URL = "https://xbtfoundwmhrqrbcuqcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LdAF-RydoXbsD2Ccscnsag_dQ-rolTO";

const DIRECTORY_SOURCE = "nonprofits_search_app_v1";
const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";
const TRUSTED_ORGS_SOURCE = "nonprofits";

const PODCAST_URL = "https://www.youtube.com/@TheOutreachProjectHq";

const PAGE_SIZE = 100;
const TRUSTED_PAGE_SIZE = 30;
const DEMO_MODE = true;

const STATES = [
  ["", "Select a state..."],
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["DC", "District of Columbia"]
];

const NTEE_MAJOR = {
  "A": "Arts, Culture & Humanities",
  "B": "Education",
  "C": "Environment",
  "D": "Animal-Related",
  "E": "Health Care",
  "F": "Mental Health & Crisis",
  "G": "Disease & Disorders",
  "H": "Medical Research",
  "I": "Crime & Legal",
  "J": "Employment",
  "K": "Food, Agriculture & Nutrition",
  "L": "Housing & Shelter",
  "M": "Public Safety & Disaster",
  "N": "Recreation & Sports",
  "O": "Youth Development",
  "P": "Human Services",
  "Q": "International",
  "R": "Civil Rights & Advocacy",
  "S": "Community Improvement",
  "T": "Mutual & Membership Benefit",
  "U": "Science & Technology",
  "V": "Social Science",
  "W": "Public & Societal Benefit",
  "X": "Religion-Related",
  "Y": "Mutual/Membership (Other)",
  "Z": "Unknown/Other"
};

const SERVICE_OPTIONS = [
  ["", "All service areas"],
  ...Object.keys(NTEE_MAJOR).sort().map(k => [k, NTEE_MAJOR[k]])
];

const FAV_KEY = "top_favorites_v3";
const PROFILE_KEY = "top_profile_v3";

let sb = null;
let els = null;
let currentPage = 1;
let isSearching = false;
let activeSearchId = 0;
let searchTimer = null;
let lastTotalCount = null;

let trustedCache = [];
let trustedOffset = 0;
let trustedLoaded = false;

let pendingOpenAfterUpgrade = null;
const exactCountCache = new Map();

/* ===============================
   HELPERS
   =============================== */
function stateNameFromCode(code) {
  const match = STATES.find(([abbr]) => abbr === code);
  return match ? match[1] : (code || "Selected State");
}

function safeText(v, fallback = "—") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s ? s : fallback;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function safeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    return new URL(s).href;
  } catch {
    return null;
  }
}

function nteeToService(nteeCode) {
  const code = (nteeCode || "").trim().toUpperCase();
  const letter = code ? code[0] : "";
  return NTEE_MAJOR[letter] || "General";
}

function googleQueryUrl(name, city, state) {
  const q = [name, city, state, "nonprofit"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizeAudienceValue(v) {
  if (!v || v === "all") return null;
  return String(v).toLowerCase();
}

function rowEin(r) {
  return String(r?.ein ?? r?.EIN ?? r?.Ein ?? "").trim();
}

function rowName(r) {
  return safeText(r?.org_name ?? r?.name ?? r?.NAME ?? "Unknown Organization");
}

function rowCity(r) {
  return safeText(r?.city ?? r?.CITY ?? "", "");
}

function rowState(r) {
  return safeText(r?.state ?? r?.STATE ?? "", "");
}

function rowNtee(r) {
  return safeText(r?.ntee_code ?? r?.ntee ?? r?.NTEE_CODE ?? "", "");
}

function rowTrusted(r) {
  return !!(r?.is_trusted ?? r?.trusted ?? false);
}

function rowWebsite(r) {
  return r?.website ?? r?.Website ?? "";
}

function rowInstagram(r) {
  return r?.instagram_url ?? r?.instagram ?? "";
}

function rowFacebook(r) {
  return r?.facebook_url ?? r?.facebook ?? "";
}

function rowYoutube(r) {
  return r?.youtube_url ?? r?.youtube ?? "";
}

function rowX(r) {
  return r?.x_url ?? r?.twitter ?? "";
}

function rowLinkedin(r) {
  return r?.linkedin_url ?? r?.linkedin ?? "";
}

function makeSearchCacheKey(params) {
  return JSON.stringify({
    state: params.state || "",
    q: (params.q || "").trim().toLowerCase(),
    serviceLetter: params.serviceLetter || "",
    audience: params.audience || "",
    pageSize: PAGE_SIZE
  });
}

/* ===============================
   LOCAL STORAGE
   =============================== */
function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveFavs(arr) {
  localStorage.setItem(FAV_KEY, JSON.stringify(arr));
}

function isFav(ein) {
  return loadFavs().includes(String(ein));
}

function toggleFav(ein) {
  const id = String(ein);
  const favs = loadFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(id);
  saveFavs(favs.slice(0, 500));
}

function defaultProfile() {
  return {
    name: "Welcome back.",
    email: "",
    tier: "supporter",
    theme: "clean",
    banner: "How can we assist you today?",
    photoDataUrl: "",
    badges: { veteran: false, youtube: false }
  };
}

function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return defaultProfile();
  try {
    const p = JSON.parse(raw);
    const d = defaultProfile();
    return { ...d, ...p, badges: { ...d.badges, ...(p.badges || {}) } };
  } catch {
    return defaultProfile();
  }
}

function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function isMember() {
  return String(loadProfile().tier || "").toLowerCase() === "member";
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || "clean");
}

function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "O";
  const b = parts[1]?.[0] || "P";
  return (a + b).toUpperCase();
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Unable to read file"));
    r.readAsDataURL(file);
  });
}

/* ===============================
   DOM HELPERS
   =============================== */
function setStatus(msg) {
  if (els?.status) els.status.textContent = msg || "";
}

function setMeta(msg) {
  if (els?.meta) els.meta.textContent = msg || "";
}

function setTrustedStatus(msg) {
  if (els?.trustedStatus) els.trustedStatus.textContent = msg || "";
}

function setControlsSearching(on) {
  isSearching = !!on;

  if (els?.searchBtn) {
    els.searchBtn.disabled = on;
    els.searchBtn.textContent = on ? "Searching..." : "Search";
  }

  if (els?.clearBtn) els.clearBtn.disabled = on;
  if (els?.stateSelect) els.stateSelect.disabled = on;
  if (els?.qInput) els.qInput.disabled = on;
  if (els?.serviceSelect) els.serviceSelect.disabled = on;
  if (els?.audienceSelect) els.audienceSelect.disabled = on;

  if (els?.prevBtn) els.prevBtn.disabled = on || currentPage <= 1;
  if (els?.nextBtn) els.nextBtn.disabled = on;
}

/* ===============================
   NAV
   =============================== */
function setActiveNav(nav) {
  els.navItems.forEach(b => b.classList.toggle("isActive", b.dataset.nav === nav));
  Object.values(els.sections).forEach(s => s?.classList.remove("isActive"));
  const sec = els.sections[nav];
  if (sec) sec.classList.add("isActive");
}

function showSectionOnly(sectionId, navToKeep = null) {
  Object.values(els.sections).forEach(s => s?.classList.remove("isActive"));
  const sec = els.sections[sectionId];
  if (sec) sec.classList.add("isActive");
  if (navToKeep) {
    els.navItems.forEach(b => b.classList.toggle("isActive", b.dataset.nav === navToKeep));
  }
}

/* ===============================
   MODALS
   =============================== */
function openUpgradeModal(context = null) {
  pendingOpenAfterUpgrade = context || pendingOpenAfterUpgrade;
  if (els.upgradeModal) els.upgradeModal.hidden = false;
}

function closeUpgradeModal() {
  if (els.upgradeModal) els.upgradeModal.hidden = true;
}

function cancelUpgradeFlow() {
  const cameFromLockedGate =
    pendingOpenAfterUpgrade === "sponsors" ||
    pendingOpenAfterUpgrade === "community";

  closeUpgradeModal();

  if (cameFromLockedGate) {
    pendingOpenAfterUpgrade = null;
    setActiveNav("home");
    scrollToTop();
  }
}

function openEditModal() {
  if (els.editModal) els.editModal.hidden = false;
}

function closeEditModal() {
  if (els.editModal) els.editModal.hidden = true;
}

function resetDemoState() {
  localStorage.removeItem(FAV_KEY);
  localStorage.removeItem(PROFILE_KEY);

  saveProfile(defaultProfile());

  const note = document.getElementById("demoPayNote");
  if (note) note.textContent = "";

  currentPage = 1;
  lastTotalCount = null;
  exactCountCache.clear();

  if (els.results) els.results.innerHTML = "";
  setStatus("");
  setMeta("");

  setActiveNav("home");
  renderProfile();
  renderProfileSavedAndFeed();
}

/* ===============================
   MEMBERSHIP GATES
   =============================== */
function syncMembershipUI() {
  const member = isMember();

  if (els.sponsorsLock) els.sponsorsLock.hidden = member;
  if (els.communityLock) els.communityLock.hidden = member;

  if (els.sponsorsLockedNote) els.sponsorsLockedNote.hidden = member;
  if (els.sponsorsContent) els.sponsorsContent.hidden = !member;

  if (els.supporterUpsellCard) els.supporterUpsellCard.hidden = member;

  if (els.communityPost) els.communityPost.disabled = !member;
}

function openSponsors(force = false) {
  if (!isMember() && !force) {
    pendingOpenAfterUpgrade = "sponsors";
    openUpgradeModal("sponsors");
    return;
  }

  showSectionOnly("sponsors", "home");
  syncMembershipUI();
  scrollToTop();
}

function openCommunity(force = false) {
  if (!isMember() && !force) {
    pendingOpenAfterUpgrade = "community";
    openUpgradeModal("community");
    return;
  }

  showSectionOnly("community", "home");
  syncMembershipUI();
  scrollToTop();
}

/* ===============================
   PROFILE RENDER
   =============================== */
function renderBadges(p) {
  if (!els.profileBadges) return;

  const badges = [];
  if (p.badges?.veteran) badges.push({ label: "Veteran", cls: "veteran" });
  if (p.badges?.youtube) badges.push({ label: "YouTube Fan", cls: "youtube" });

  els.profileBadges.innerHTML = badges
    .map(b => `<span class="pill ${b.cls}">${escapeHtml(b.label)}</span>`)
    .join("");
}

function highlightChips() {
  const p = loadProfile();

  document.querySelectorAll('#themeField [data-theme]').forEach(btn => {
    const t = btn.getAttribute("data-theme");
    btn.classList.toggle("isOn", (p.theme || "clean") === t);
    btn.classList.toggle("isDisabled", !isMember());
  });

  document.querySelectorAll('[data-badge]').forEach(btn => {
    const key = btn.getAttribute("data-badge");
    btn.classList.toggle("isOn", !!p.badges?.[key]);
  });
}

function renderProfile() {
  const p = loadProfile();
  applyTheme(p.theme);

  const member = String(p.tier || "").toLowerCase() === "member";
  const roleText = member ? "⭐ Member" : "Supporter";

  /* HOME CARD */
  if (els.profileName) {
    els.profileName.textContent = p.name?.trim() || "Welcome back.";
  }

  if (els.profilePrompt) {
    els.profilePrompt.textContent = p.banner?.trim() || "How can we assist you today?";
  }

  if (els.profileRoleHome) {
    els.profileRoleHome.textContent = roleText;
  }

  if (els.profileLoc) {
    els.profileLoc.textContent = p.email?.trim() || "Set your location";
  }

  /* PROFILE PAGE */
  if (els.profileDisplayName) {
    els.profileDisplayName.textContent = p.name?.trim() || "Welcome back.";
  }

  if (els.profileRoleDisplay) {
    els.profileRoleDisplay.textContent = roleText;
  }

  if (els.profileDisplayEmail) {
    els.profileDisplayEmail.textContent = p.email?.trim() || "Set your location";
  }

  if (els.profileDisplayBanner) {
    els.profileDisplayBanner.textContent = p.banner?.trim() || "How can we assist you today?";
  }

  const photoSrc = p.photoDataUrl || "assets/top_profile_circle_1024.png";

  if (els.profilePhotoImg) {
    els.profilePhotoImg.src = photoSrc;
  }

  if (els.avatarCircle) {
    const initials = initialsFromName(p.name || "OP");
    els.avatarCircle.innerHTML = `
      <img
        src="${photoSrc}"
        alt="Profile"
        style="width:100%;height:100%;object-fit:cover;border-radius:999px;"
        onerror="this.remove(); this.parentNode.textContent='${initials}';"
      />
    `;
  }

  if (els.editName) els.editName.value = p.name || "";
  if (els.editEmail) els.editEmail.value = p.email || "";
  if (els.editBanner) els.editBanner.value = p.banner || "";

  renderBadges(p);
  syncMembershipUI();
  highlightChips();
}

/* ===============================
   MEMBER FEED
   =============================== */
function buildMemberFeedItems() {
  return [
    {
      icon: "🎥",
      title: "Early YouTube Drop (Member Early Access)",
      meta: "Members get episodes before public release.",
      body: "This is where early-access links and drops will appear. (Demo content)",
      ctaLabel: "Open Channel",
      ctaFn: () => window.open(PODCAST_URL, "_blank", "noopener")
    },
    {
      icon: "🎁",
      title: "+5 Bonus Giveaway Entries Active",
      meta: "Included with your $5.99 membership.",
      body: "Members receive five additional entries for TOP sweepstakes and partner giveaways. (Demo content)",
      ctaLabel: "Open Community",
      ctaFn: () => openCommunity(true)
    },
    {
      icon: "🤝",
      title: "Sponsor Perk — Rope Solutions",
      meta: "Foundational Sponsor",
      body: "Member perk: 15% off leadership training. Code: TOP15 (Demo)",
      ctaLabel: "Open Sponsors",
      ctaFn: () => openSponsors(true)
    }
  ];
}

function renderMemberFeed() {
  if (!els.memberFeedList || !els.memberFeedCard) return;

  if (!isMember()) {
    els.memberFeedCard.hidden = true;
    return;
  }

  els.memberFeedCard.hidden = false;
  els.memberFeedList.innerHTML = "";

  for (const item of buildMemberFeedItems()) {
    const card = document.createElement("div");
    card.className = "feedCard";
    card.innerHTML = `
      <div class="feedTop">
        <div>
          <div class="feedTitle">${escapeHtml(item.icon)} ${escapeHtml(item.title)}</div>
          <div class="feedMeta">${escapeHtml(item.meta)}</div>
        </div>
      </div>
      <div class="muted" style="margin-top:8px;">${escapeHtml(item.body)}</div>
      <div class="feedBtnRow">
        <button class="btnPrimary" type="button">${escapeHtml(item.ctaLabel)}</button>
      </div>
    `;
    card.querySelector("button")?.addEventListener("click", item.ctaFn);
    els.memberFeedList.appendChild(card);
  }
}

/* ===============================
   DIRECTORY LINKS / FAVORITES
   =============================== */
function buildDirectoryLinks(r, isTrusted) {
  const links = [];
  const website = safeUrl(rowWebsite(r));
  const ig = safeUrl(rowInstagram(r));
  const fb = safeUrl(rowFacebook(r));
  const yt = safeUrl(rowYoutube(r));
  const x = safeUrl(rowX(r));
  const li = safeUrl(rowLinkedin(r));

  if (website) links.push({ label: "Website", url: website });

  if (isTrusted) {
    if (ig) links.push({ label: "Instagram", url: ig });
    if (fb) links.push({ label: "Facebook", url: fb });
    if (yt) links.push({ label: "YouTube", url: yt });
    if (x) links.push({ label: "X", url: x });
    if (li) links.push({ label: "LinkedIn", url: li });
  }

  return links;
}

function bindResultFavButtons(rootEl) {
  if (!rootEl) return;

  rootEl.querySelectorAll("[data-fav]").forEach(btn => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", async () => {
      if (!isMember()) {
        openUpgradeModal();
        return;
      }

      const ein = btn.getAttribute("data-fav");
      toggleFav(ein);
      btn.classList.toggle("on", isFav(ein));
      btn.textContent = isFav(ein) ? "★" : "☆";
      await renderProfileSavedAndFeed();
    });
  });
}

function renderResultsInto(rows, mountEl) {
  if (!mountEl) return;
  mountEl.innerHTML = "";

  for (const r of rows) {
    const name = rowName(r);
    const city = rowCity(r);
    const st = rowState(r);
    const loc = [city, st].filter(Boolean).join(", ") || "Location not listed";
    const serviceLabel = nteeToService(rowNtee(r));
    const trusted = rowTrusted(r);
    const ein = rowEin(r);
    const links = buildDirectoryLinks(r, trusted);
    const findUrl = googleQueryUrl(name, city, st);

    const allowFav = isMember() && !!ein;
    const favOn = allowFav ? isFav(ein) : false;

    const card = document.createElement("div");
    card.className = "resultCard";
    card.innerHTML = `
      ${allowFav ? `<button class="favCorner ${favOn ? "on" : ""}" type="button" data-fav="${escapeHtml(ein)}" aria-label="Favorite">${favOn ? "★" : "☆"}</button>` : ""}
      <div class="resultTop">
        <div>
          <div class="resultName">${escapeHtml(name)}</div>
          <div class="resultSub">${escapeHtml(loc)}</div>
        </div>
      </div>
      <div class="badges">
        ${trusted ? `<span class="badge">Trusted</span>` : `<span class="badge">General</span>`}
        <span class="badge">${escapeHtml(serviceLabel)}</span>
      </div>
      <div class="resultActions">
        <a class="btnBlack" href="${findUrl}" target="_blank" rel="noopener">Find Info</a>
        ${links.map(l => `<a class="linkBtn" href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`).join("")}
      </div>
    `;
    mountEl.appendChild(card);
  }

  bindResultFavButtons(mountEl);
}

async function renderFavoritesIntoEl(mountEl, emptyEl) {
  if (!mountEl) return;

  const favs = loadFavs();
  if (emptyEl) emptyEl.hidden = favs.length !== 0;
  mountEl.innerHTML = "";

  if (!favs.length) return;
  if (!sb) return;

  const allRows = [];
  const chunkSize = 50;

  for (let i = 0; i < favs.length; i += chunkSize) {
    const chunk = favs.slice(i, i + chunkSize);
    const { data, error } = await sb.from(DIRECTORY_SOURCE).select("*").in("ein", chunk);
    if (error) {
      console.error("Favorites lookup failed:", error);
      continue;
    }
    if (data?.length) allRows.push(...data);
  }

  const byEin = new Map(allRows.map(r => [rowEin(r), r]));
  const ordered = favs.map(ein => byEin.get(String(ein))).filter(Boolean);

  renderResultsInto(ordered, mountEl);
}

async function renderProfileSavedAndFeed() {
  const member = isMember();

  if (els.profileSavedCard) els.profileSavedCard.hidden = !member;

  if (member) {
    await renderFavoritesIntoEl(els.profileFavoritesList, els.profileFavoritesEmpty);
  } else {
    if (els.profileFavoritesList) els.profileFavoritesList.innerHTML = "";
    if (els.profileFavoritesEmpty) els.profileFavoritesEmpty.hidden = true;
  }

  renderMemberFeed();
}

/* ===============================
   SEARCH
   =============================== */
function buildSearchParams() {
  return {
    state: els.stateSelect?.value || "",
    q: (els.qInput?.value || "").trim(),
    serviceLetter: els.serviceSelect?.value || "",
    audience: normalizeAudienceValue(els.audienceSelect?.value || "all"),
    page: currentPage
  };
}

function applySearchFilters(query, params) {
  let q = query.eq("state", params.state);

  if (params.q) {
    const term = params.q.replace(/,/g, " ").trim();
    if (term) {
      q = q.or(`org_name.ilike.%${term}%,city.ilike.%${term}%`);
    }
  }

  if (params.serviceLetter) {
    q = q.ilike("ntee_code", `${params.serviceLetter}%`);
  }

  if (params.audience === "veteran") {
    q = q.eq("serves_veterans", true);
  } else if (params.audience === "first_responder") {
    q = q.eq("serves_first_responders", true);
  }

  return q;
}

async function fetchSearchPage(params, page) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = sb
    .from(DIRECTORY_SOURCE)
    .select("*")
    .range(from, to);

  query = applySearchFilters(query, params);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchSearchCountSafe(params) {
  try {
    let query = sb
      .from(DIRECTORY_SOURCE)
      .select("*", { count: "exact", head: true });

    query = applySearchFilters(query, params);

    const { count, error } = await query;
    if (error) {
      console.warn("Exact count failed:", error);
      return null;
    }

    return typeof count === "number" ? count : null;
  } catch (e) {
    console.warn("Exact count threw:", e);
    return null;
  }
}

function renderResults(rows) {
  if (!els.results) return;

  if (!rows || rows.length === 0) {
    els.results.innerHTML = `
      <div class="emptyState">
        <div class="emptyText">No matches. Try a broader search or a different service area.</div>
      </div>
    `;
    return;
  }

  renderResultsInto(rows, els.results);
}

function renderMeta(totalCount, page, gotRows, stateCode, options = {}) {
  const { loadingTotal = false } = options;

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = from + Math.max(0, (gotRows || 0) - 1);
  const stateName = stateNameFromCode(stateCode);

  if (gotRows > 0) {
    if (typeof totalCount === "number" && totalCount >= 0) {
      setStatus(`${stateName} — ${totalCount.toLocaleString()} organizations found`);
      setMeta(`Displaying ${from.toLocaleString()}–${to.toLocaleString()} • Page ${page}`);
    } else if (loadingTotal) {
      setStatus(`${stateName} — calculating total...`);
      setMeta(`Displaying ${from.toLocaleString()}–${to.toLocaleString()} • Page ${page}`);
    } else {
      setStatus(`${stateName} — calculating total...`);
      setMeta(`Displaying ${from.toLocaleString()}–${to.toLocaleString()} • Page ${page}`);
    }
  } else {
    setStatus(`No organizations found in ${stateName}.`);
    setMeta("");
  }

  if (els.pageLabel) els.pageLabel.textContent = `Page ${page}`;
  if (els.prevBtn) els.prevBtn.disabled = isSearching || page <= 1;

  if (els.nextBtn) {
    if (typeof totalCount === "number" && totalCount >= 0) {
      const reachedEnd = (page * PAGE_SIZE) >= totalCount;
      els.nextBtn.disabled = isSearching || reachedEnd || gotRows === 0;
    } else {
      els.nextBtn.disabled = isSearching || gotRows < PAGE_SIZE;
    }
  }
}

function scheduleSearch({ resetPage = false } = {}) {
  clearTimeout(searchTimer);
  if (resetPage) currentPage = 1;
  const mySearchId = ++activeSearchId;
  searchTimer = setTimeout(() => runSearch(mySearchId), 120);
}

async function runSearch(searchId) {
  const myId = searchId;

  try {
    if (!sb) {
      setStatus("Supabase client not initialized.");
      setMeta("Make sure Supabase CDN script loads BEFORE app.js.");
      return;
    }

    const params = buildSearchParams();
    const cacheKey = makeSearchCacheKey(params);
    const cachedExactCount = exactCountCache.has(cacheKey)
      ? exactCountCache.get(cacheKey)
      : null;

    if (!params.state) {
      setStatus("Please select a state.");
      setMeta("");
      if (els.results) els.results.innerHTML = "";
      return;
    }

    setControlsSearching(true);

    if (typeof cachedExactCount === "number") {
      const cachedFrom = ((params.page - 1) * PAGE_SIZE) + 1;
      const cachedTo = Math.min(params.page * PAGE_SIZE, cachedExactCount);
      setStatus(`${stateNameFromCode(params.state)} — ${cachedExactCount.toLocaleString()} organizations found`);
      setMeta(`Displaying ${cachedFrom.toLocaleString()}–${cachedTo.toLocaleString()} • Page ${params.page}`);
    } else {
      setStatus("Hold on — resources are on the way.");
      setMeta("");
    }

    const rows = await fetchSearchPage(params, params.page);
    if (myId !== activeSearchId) return;

    renderResults(rows);

    renderMeta(
      cachedExactCount,
      params.page,
      rows.length,
      params.state,
      { loadingTotal: cachedExactCount === null }
    );

    if (typeof cachedExactCount === "number") {
      lastTotalCount = cachedExactCount;
      return;
    }

    const totalCount = await fetchSearchCountSafe(params);
    if (myId !== activeSearchId) return;

    if (typeof totalCount === "number") {
      exactCountCache.set(cacheKey, totalCount);
      lastTotalCount = totalCount;
      renderMeta(totalCount, params.page, rows.length, params.state, { loadingTotal: false });
    } else {
      lastTotalCount = null;
      renderMeta(null, params.page, rows.length, params.state, { loadingTotal: true });
    }

  } catch (e) {
    if (myId !== activeSearchId) return;
    console.error("Search page query failed:", e);
    setStatus("Search failed. Please try again.");
    setMeta("");
    if (els.results) els.results.innerHTML = "";
    lastTotalCount = null;
  } finally {
    if (myId === activeSearchId) setControlsSearching(false);
  }
}

/* ===============================
   TRUSTED (FAST PATH)
   =============================== */
function clearTrusted() {
  trustedCache = [];
  trustedOffset = 0;
  trustedLoaded = false;
  if (els.trustedResults) els.trustedResults.innerHTML = "";
}

async function hydrateTrustedCache() {
  if (!sb) return;

  setTrustedStatus("Loading trusted resources...");

  const profSelect = [
    "ein",
    "display_name_override",
    "website",
    "instagram_url",
    "facebook_url",
    "youtube_url",
    "x_url",
    "linkedin_url",
    "is_trusted"
  ].join(",");

  const { data: profiles, error: pErr } = await sb
    .from(TRUSTED_PROFILES_SOURCE)
    .select(profSelect)
    .eq("is_trusted", true)
    .limit(500);

  if (pErr) {
    console.error(pErr);
    setTrustedStatus("Unable to load trusted resources right now.");
    trustedLoaded = true;
    return;
  }

  const profRows = profiles || [];
  if (!profRows.length) {
    setTrustedStatus("No trusted resources found yet.");
    trustedLoaded = true;
    return;
  }

  const eins = profRows.map(r => r.ein).filter(Boolean);
  if (!eins.length) {
    setTrustedStatus("Trusted profiles found, but EINs are missing.");
    trustedLoaded = true;
    return;
  }

  const { data: orgs, error: oErr } = await sb
    .from(TRUSTED_ORGS_SOURCE)
    .select("ein,name,city,state,ntee_code")
    .in("ein", eins);

  if (oErr) {
    console.error(oErr);
    setTrustedStatus("Unable to load trusted resources right now.");
    trustedLoaded = true;
    return;
  }

  const orgMap = new Map((orgs || []).map(o => [String(o.ein), o]));

  const merged = profRows.map(p => {
    const o = orgMap.get(String(p.ein)) || {};
    return {
      ein: p.ein,
      org_name: p.display_name_override || o.name || "Trusted Resource",
      city: o.city || "",
      state: o.state || "",
      ntee_code: o.ntee_code || "",
      website: p.website || "",
      instagram_url: p.instagram_url || "",
      facebook_url: p.facebook_url || "",
      youtube_url: p.youtube_url || "",
      x_url: p.x_url || "",
      linkedin_url: p.linkedin_url || "",
      is_trusted: true
    };
  });

  merged.sort((a, b) => (a.org_name || "").localeCompare((b.org_name || ""), undefined, { sensitivity: "base" }));

  trustedCache = merged;
  trustedLoaded = true;
  setTrustedStatus("");
}

function renderTrustedInto(rows) {
  if (!els.trustedResults) return;

  for (const r of rows) {
    const ein = rowEin(r);
    const name = rowName(r);
    const city = rowCity(r);
    const st = rowState(r);
    const loc = [city, st].filter(Boolean).join(", ") || "Nationwide";
    const serviceLabel = nteeToService(rowNtee(r));
    const links = buildDirectoryLinks(r, true);
    const findUrl = googleQueryUrl(name, city, st);

    const card = document.createElement("div");
    card.className = "resultCard";
    card.innerHTML = `
      ${isMember() ? `
        <button class="favCorner ${isFav(ein) ? "on" : ""}" data-fav="${escapeHtml(ein)}" type="button" aria-label="Favorite">
          ${isFav(ein) ? "★" : "☆"}
        </button>
      ` : ""}
      <div class="resultTop">
        <div>
          <div class="resultName">${escapeHtml(name)}</div>
          <div class="resultSub">${escapeHtml(loc)}</div>
        </div>
      </div>
      <div class="badges">
        <span class="badge">Trusted</span>
        <span class="badge">${escapeHtml(serviceLabel)}</span>
      </div>
      <div class="resultActions">
        <a class="btnBlack" href="${findUrl}" target="_blank" rel="noopener">Find Info</a>
        ${links.map(l => `<a class="linkBtn" href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`).join("")}
      </div>
    `;
    els.trustedResults.appendChild(card);
  }

  bindResultFavButtons(els.trustedResults);
}

async function loadTrustedPage({ reset = false } = {}) {
  try {
    if (!sb) return;

    if (reset) clearTrusted();
    if (!trustedLoaded) await hydrateTrustedCache();
    if (!trustedCache.length) return;

    const slice = trustedCache.slice(trustedOffset, trustedOffset + TRUSTED_PAGE_SIZE);

    if (!slice.length && trustedOffset === 0) {
      setTrustedStatus("No trusted resources found yet.");
      return;
    }

    if (!slice.length) {
      setTrustedStatus("No more trusted resources.");
      return;
    }

    setTrustedStatus("");
    renderTrustedInto(slice);
    trustedOffset += slice.length;
  } catch (e) {
    console.error(e);
    setTrustedStatus("Unable to load trusted resources right now.");
  }
}

/* ===============================
   DOM COLLECTION
   =============================== */
function collectEls() {
  const homeSection = document.getElementById("homeSection");
  const profileSection = document.getElementById("profileSection");

  return {
    navItems: Array.from(document.querySelectorAll(".navItem")),
    sections: {
      home: homeSection,
      trusted: document.getElementById("trustedSection"),
      profile: profileSection,
      contact: document.getElementById("contactSection"),
      sponsors: document.getElementById("sponsorsSection"),
      community: document.getElementById("communitySection")
    },

    avatarCircle: document.getElementById("avatarCircle"),
    profileName: document.getElementById("profileName"),
    profileRoleHome: homeSection?.querySelector("#profileRoleHome"),
    profileLoc: document.getElementById("profileLoc"),
    profilePrompt: document.getElementById("profilePrompt"),
    editProfileBtn: document.getElementById("editProfileBtn"),
    openProfileBtn: document.getElementById("openProfileBtn"),

    profileDisplayName: document.getElementById("profileDisplayName"),
    profileRoleDisplay: document.getElementById("profileRoleDisplay"),
    profileBadges: document.getElementById("profileBadges"),
    profileDisplayEmail: document.getElementById("profileDisplayEmail"),
    profileDisplayBanner: document.getElementById("profileDisplayBanner"),
    profilePhotoImg: document.getElementById("profilePhotoImg"),
    profileEditBtnV3: document.getElementById("profileEditBtn"),
    profileSavedCard: document.getElementById("profileSavedCard"),
    profileFavoritesList: document.getElementById("profileFavoritesList"),
    profileFavoritesEmpty: document.getElementById("profileFavoritesEmpty"),
    memberFeedCard: document.getElementById("memberFeedCard"),
    memberFeedList: document.getElementById("memberFeedList"),
    supporterUpsellCard: document.getElementById("supporterUpsellCard"),
    becomeMemberBtn: document.getElementById("becomeMemberBtn"),
    demoResetBtn: document.getElementById("demoResetBtn"),

    sponsorsLockedNote: document.getElementById("sponsorsLockedNote"),
    sponsorsUpgradeBtn: document.getElementById("sponsorsUpgradeBtn"),
    sponsorsContent: document.getElementById("sponsorsContent"),
    sponsorsLock: document.getElementById("sponsorsLock"),

    communityLock: document.getElementById("communityLock"),
    communityBackBtn: document.getElementById("communityBackBtn"),
    communityPost: document.getElementById("communityPost"),

    upgradeModal: document.getElementById("upgradeModal"),
    upgradeCloseBtn: document.getElementById("upgradeCloseBtn"),
    upgradeCancelBtn: document.getElementById("upgradeCancelBtn"),
    upgradeConfirmBtn: document.getElementById("upgradeConfirmBtn"),

    editModal: document.getElementById("editModal"),
    editCloseBtn: document.getElementById("editCloseBtn"),
    editCancelBtn: document.getElementById("editCancelBtn"),
    editSaveBtn: document.getElementById("editSaveBtn"),
    editName: document.getElementById("editName"),
    editEmail: document.getElementById("editEmail"),
    editBanner: document.getElementById("editBanner"),
    editPhoto: document.getElementById("editPhoto"),

    actionSponsors: document.getElementById("actionSponsors"),
    actionTrusted: document.getElementById("actionTrusted"),
    actionCommunity: document.getElementById("actionCommunity"),
    actionPodcast: document.getElementById("actionPodcast"),

    stateSelect: document.getElementById("stateSelect"),
    qInput: document.getElementById("qInput"),
    serviceSelect: document.getElementById("serviceSelect"),
    audienceSelect: document.getElementById("audienceSelect"),
    searchBtn: document.getElementById("searchBtn"),
    clearBtn: document.getElementById("clearBtn"),
    status: document.getElementById("status"),
    meta: document.getElementById("meta"),
    results: document.getElementById("results"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    pageLabel: document.getElementById("pageLabel"),

    trustedStatus: document.getElementById("trustedStatus"),
    trustedResults: document.getElementById("trustedResults"),
    trustedMoreBtn: document.getElementById("trustedMoreBtn"),
    trustedRefreshBtn: document.getElementById("trustedRefreshBtn")
  };
}

function populateStateSelect() {
  if (!els.stateSelect) return;
  els.stateSelect.innerHTML = STATES.map(([abbr, name]) => `<option value="${abbr}">${name}</option>`).join("");
}

function populateServiceSelect() {
  if (!els.serviceSelect) return;
  els.serviceSelect.innerHTML = SERVICE_OPTIONS.map(([v, label]) => `<option value="${v}">${label}</option>`).join("");
}

/* ===============================
   EVENTS
   =============================== */
function wireEvents() {
  els.navItems.forEach(btn => btn.addEventListener("click", async () => {
    const nav = btn.dataset.nav;
    setActiveNav(nav);

    if (nav === "trusted") {
      await loadTrustedPage({ reset: true });
    }

    if (nav === "profile") {
      renderProfile();
      await renderProfileSavedAndFeed();
    }

    scrollToTop();
  }));

  els.actionSponsors?.addEventListener("click", () => openSponsors());
  els.actionTrusted?.addEventListener("click", async () => {
    setActiveNav("trusted");
    await loadTrustedPage({ reset: true });
    scrollToTop();
  });
  els.actionCommunity?.addEventListener("click", () => openCommunity());
  els.actionPodcast?.addEventListener("click", () => window.open(PODCAST_URL, "_blank", "noopener"));

  els.sponsorsUpgradeBtn?.addEventListener("click", () => openUpgradeModal("sponsors"));

  els.becomeMemberBtn?.addEventListener("click", () => openUpgradeModal());
  els.profileEditBtnV3?.addEventListener("click", openEditModal);
  els.editProfileBtn?.addEventListener("click", openEditModal);

  els.demoResetBtn?.addEventListener("click", resetDemoState);

  els.openProfileBtn?.addEventListener("click", async () => {
    setActiveNav("profile");
    renderProfile();
    await renderProfileSavedAndFeed();
    scrollToTop();
  });

  els.upgradeCloseBtn?.addEventListener("click", cancelUpgradeFlow);
  els.upgradeCancelBtn?.addEventListener("click", cancelUpgradeFlow);
  els.upgradeModal?.addEventListener("click", (e) => {
    if (e.target === els.upgradeModal) cancelUpgradeFlow();
  });

  els.upgradeConfirmBtn?.addEventListener("click", async () => {
    const btn = els.upgradeConfirmBtn;
    const cancel = els.upgradeCancelBtn;
    const close = els.upgradeCloseBtn;
    const note = document.getElementById("demoPayNote");

    if (!DEMO_MODE) {
      const p = loadProfile();
      p.tier = "member";
      saveProfile(p);
      closeUpgradeModal();
      renderProfile();
      await renderProfileSavedAndFeed();

      if (pendingOpenAfterUpgrade === "sponsors") openSponsors(true);
      if (pendingOpenAfterUpgrade === "community") openCommunity(true);
      pendingOpenAfterUpgrade = null;
      return;
    }

    if (btn) btn.disabled = true;
    if (cancel) cancel.disabled = true;
    if (close) close.disabled = true;

    const originalText = btn ? btn.textContent : "";

    if (btn) btn.textContent = "Processing...";
    if (note) note.textContent = "Processing payment...";

    await new Promise(r => setTimeout(r, 900));

    if (btn) btn.textContent = "Approved ✅";
    if (note) note.textContent = "Payment approved. Unlocking member access...";

    await new Promise(r => setTimeout(r, 700));

    const p = loadProfile();
    p.tier = "member";
    saveProfile(p);

    closeUpgradeModal();

    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
    if (cancel) cancel.disabled = false;
    if (close) close.disabled = false;
    if (note) note.textContent = "";

    renderProfile();
    await renderProfileSavedAndFeed();

    if (pendingOpenAfterUpgrade === "sponsors") openSponsors(true);
    if (pendingOpenAfterUpgrade === "community") openCommunity(true);
    pendingOpenAfterUpgrade = null;
  });

  els.editCloseBtn?.addEventListener("click", closeEditModal);
  els.editCancelBtn?.addEventListener("click", closeEditModal);
  els.editModal?.addEventListener("click", (e) => {
    if (e.target === els.editModal) closeEditModal();
  });

  document.querySelectorAll('#themeField [data-theme]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (!isMember()) {
        openUpgradeModal();
        return;
      }

      const p = loadProfile();
      p.theme = btn.getAttribute("data-theme") || "clean";
      saveProfile(p);
      renderProfile();
    });
  });

  document.querySelectorAll('[data-badge]').forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-badge");
      const p = loadProfile();
      p.badges = p.badges || {};
      p.badges[key] = !p.badges[key];
      saveProfile(p);
      renderProfile();
    });
  });

  els.editPhoto?.addEventListener("change", async () => {
    const file = els.editPhoto.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const p = loadProfile();
    p.photoDataUrl = dataUrl;
    saveProfile(p);
    renderProfile();
  });

  els.editSaveBtn?.addEventListener("click", async () => {
    const p = loadProfile();
    p.name = (els.editName?.value || "").trim() || "Welcome back.";
    p.email = (els.editEmail?.value || "").trim();
    p.banner = (els.editBanner?.value || "").trim() || "How can we assist you today?";
    saveProfile(p);

    closeEditModal();
    renderProfile();
    await renderProfileSavedAndFeed();
  });

  els.communityBackBtn?.addEventListener("click", () => {
    setActiveNav("home");
    scrollToTop();
  });

  els.searchBtn?.addEventListener("click", () => scheduleSearch({ resetPage: true }));

  function markSearchNeedsRefresh(message = "Filters updated. Press Search to refresh results.") {
    currentPage = 1;
    lastTotalCount = null;

    const hasResults = !!(els.results && els.results.children.length > 0);
    if (hasResults) {
      setStatus(message);
      setMeta("");
    } else {
      setStatus("");
      setMeta("");
    }
  }

  els.stateSelect?.addEventListener("change", () => {
    if (!els.stateSelect.value) {
      currentPage = 1;
      lastTotalCount = null;
      if (els.results) els.results.innerHTML = "";
      setStatus("");
      setMeta("");
      return;
    }
    markSearchNeedsRefresh();
  });

  els.serviceSelect?.addEventListener("change", () => {
    markSearchNeedsRefresh();
  });

  els.audienceSelect?.addEventListener("change", () => {
    markSearchNeedsRefresh();
  });

  els.qInput?.addEventListener("input", () => {
    if (String(els.qInput.value || "").trim().length === 0) {
      currentPage = 1;
      lastTotalCount = null;
      return;
    }
    markSearchNeedsRefresh();
  });

  els.clearBtn?.addEventListener("click", () => {
    if (els.qInput) els.qInput.value = "";
    if (els.audienceSelect) els.audienceSelect.value = "all";
    if (els.serviceSelect) els.serviceSelect.value = "";
    if (els.stateSelect) els.stateSelect.value = "";
    currentPage = 1;
    lastTotalCount = null;

    if (els.results) els.results.innerHTML = "";
    setStatus("");
    setMeta("");

    if (els.pageLabel) els.pageLabel.textContent = "Page 1";
    if (els.prevBtn) els.prevBtn.disabled = true;
    if (els.nextBtn) els.nextBtn.disabled = false;
  });

  els.prevBtn?.addEventListener("click", () => {
    if (isSearching) return;
    if (currentPage <= 1) return;
    currentPage -= 1;
    scheduleSearch({ resetPage: false });
  });

  els.nextBtn?.addEventListener("click", () => {
    if (isSearching) return;
    currentPage += 1;
    scheduleSearch({ resetPage: false });
  });

  els.trustedRefreshBtn?.addEventListener("click", () => loadTrustedPage({ reset: true }));
  els.trustedMoreBtn?.addEventListener("click", () => loadTrustedPage({ reset: false }));
}

/* ===============================
   INIT
   =============================== */
function init() {
  sb = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY) || null;

  els = collectEls();
  populateStateSelect();
  populateServiceSelect();
  renderProfile();
  wireEvents();
  setActiveNav("home");

  if (!sb) {
    setStatus("Supabase client not initialized.");
    setMeta("Make sure Supabase CDN script is loaded before app.js in index.html.");
  } else {
    setStatus("");
    setMeta("");
  }
}

window.addEventListener("DOMContentLoaded", init);