/* ===============================
   THE OUTREACH PROJECT — APP LOGIC (V2 / 4-NAV)
   ✅ OPERATION "SLOW DOWN / NO CRASH" — REBUILD (STABLE)
   - Directory runs ONLY when user presses Search (no auto-search on state change)
   - Debounced search (settle time)
   - Single-flight + latest-result-wins (prevents overlapping queries / race conditions)
   - 25 per page
   - EXACT count shown (no ~) via HEAD-only count query (safer)
   =============================== */

/** ====== CONFIG ====== **/
const SUPABASE_URL = "https://xbtfoundwmhrqrbcuqcw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LdAF-RydoXbsD2Ccscnsag_dQ-rolTO";

const DIRECTORY_SOURCE = "nonprofits_search_all_v2";
const TRUSTED_PROFILES_SOURCE = "nonprofit_profiles";
const TRUSTED_ORGS_SOURCE = "nonprofits";

const PODCAST_URL = "https://www.youtube.com/@TheOutreachProjectHq";

const COL = {
  ein: "ein",
  name: "org_name",
  city: "city",
  state: "state",
  ntee: "ntee_code",
  serves_veterans: "serves_veterans",
  serves_first: "serves_first_responders",
  is_trusted: "is_trusted",

  website: "website",
  instagram: "instagram_url",
  facebook: "facebook_url",
  youtube: "youtube_url",
  x: "x_url",
  linkedin: "linkedin_url",
  email: "contact_email",
  phone: "phone",
};

const PAGE_SIZE = 25;
const TRUSTED_PAGE_SIZE = 30;

const sb = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ====== States ====== */
const STATES = [
  ["","Select a state..."],
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
  ["DC","District of Columbia"]
];

const NTEE_MAJOR = {
  "A": "Arts, Culture & Humanities","B": "Education","C": "Environment","D": "Animal-Related",
  "E": "Health Care","F": "Mental Health & Crisis","G": "Disease & Disorders","H": "Medical Research",
  "I": "Crime & Legal","J": "Employment","K": "Food, Agriculture & Nutrition","L": "Housing & Shelter",
  "M": "Public Safety & Disaster","N": "Recreation & Sports","O": "Youth Development","P": "Human Services",
  "Q": "International","R": "Civil Rights & Advocacy","S": "Community Improvement","T": "Mutual & Membership Benefit",
  "U": "Science & Technology","V": "Social Science","W": "Public & Societal Benefit","X": "Religion-Related",
  "Y": "Mutual/Membership (Other)","Z": "Unknown/Other"
};

const SERVICE_OPTIONS = [
  ["", "All service areas"],
  ["A", NTEE_MAJOR.A],["B", NTEE_MAJOR.B],["C", NTEE_MAJOR.C],["D", NTEE_MAJOR.D],
  ["E", NTEE_MAJOR.E],["F", NTEE_MAJOR.F],["G", NTEE_MAJOR.G],["H", NTEE_MAJOR.H],
  ["I", NTEE_MAJOR.I],["J", NTEE_MAJOR.J],["K", NTEE_MAJOR.K],["L", NTEE_MAJOR.L],
  ["M", NTEE_MAJOR.M],["N", NTEE_MAJOR.N],["O", NTEE_MAJOR.O],["P", NTEE_MAJOR.P],
  ["Q", NTEE_MAJOR.Q],["R", NTEE_MAJOR.R],["S", NTEE_MAJOR.S],["T", NTEE_MAJOR.T],
  ["U", NTEE_MAJOR.U],["V", NTEE_MAJOR.V],["W", NTEE_MAJOR.W],["X", NTEE_MAJOR.X],
  ["Y", NTEE_MAJOR.Y],["Z", NTEE_MAJOR.Z],
];

/* ====== Elements ====== */
const els = {
  navItems: Array.from(document.querySelectorAll(".navItem")),
  sections: {
    home: document.getElementById("homeSection"),
    trusted: document.getElementById("trustedSection"),
    community: document.getElementById("communitySection"),
    favorites: document.getElementById("favoritesSection"),
    profile: document.getElementById("profileSection"),
  },

  // Community
  communityBackBtn: document.getElementById("communityBackBtn"),

  // Profile (home header)
  avatarCircle: document.getElementById("avatarCircle"),
  profileName: document.getElementById("profileName"),
  profileRole: document.getElementById("profileRole"),
  profileLoc: document.getElementById("profileLoc"),
  editProfileBtn: document.getElementById("editProfileBtn"),
  openProfileBtn: document.getElementById("openProfileBtn"),

  // Profile form
  profileNameInput: document.getElementById("profileNameInput"),
  profileRoleSelect: document.getElementById("profileRoleSelect"),
  profileCityInput: document.getElementById("profileCityInput"),
  profileStateInput: document.getElementById("profileStateInput"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  resetProfileBtn: document.getElementById("resetProfileBtn"),
  profileMeta: document.getElementById("profileMeta"),

  // Quick actions
  actionFindSupport: document.getElementById("actionFindSupport"),
  actionTrusted: document.getElementById("actionTrusted"),
  actionCommunity: document.getElementById("actionCommunity"),
  actionPodcast: document.getElementById("actionPodcast"),

  // Directory
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
  directoryAnchor: document.getElementById("directorySectionAnchor"),

  // Trusted
  trustedStatus: document.getElementById("trustedStatus"),
  trustedResults: document.getElementById("trustedResults"),
  trustedMoreBtn: document.getElementById("trustedMoreBtn"),
  trustedRefreshBtn: document.getElementById("trustedRefreshBtn"),

  // Favorites
  favoritesList: document.getElementById("favoritesList"),
  favoritesEmpty: document.getElementById("favoritesEmpty"),
  favClearBtn: document.getElementById("favClearBtn"),
};

let currentPage = 1;

/* ====== OPERATION SLOW DOWN / NO CRASH ====== */
const SEARCH_DEBOUNCE_MS = 600;
let searchTimer = null;
let activeSearchId = 0;
let isSearching = false;

function setStatus(msg) { if (els.status) els.status.textContent = msg || ""; }
function setMeta(msg) { if (els.meta) els.meta.textContent = msg || ""; }
function setTrustedStatus(msg) { if (els.trustedStatus) els.trustedStatus.textContent = msg || ""; }

function setControlsSearching(on) {
  isSearching = !!on;

  if (els.searchBtn) {
    els.searchBtn.disabled = on;
    els.searchBtn.textContent = on ? "Searching…" : "Search";
  }
  if (els.clearBtn) els.clearBtn.disabled = on;

  if (els.stateSelect) els.stateSelect.disabled = on;
  if (els.qInput) els.qInput.disabled = on;
  if (els.serviceSelect) els.serviceSelect.disabled = on;
  if (els.audienceSelect) els.audienceSelect.disabled = on;

  if (els.prevBtn) els.prevBtn.disabled = on || currentPage <= 1;
  if (els.nextBtn) els.nextBtn.disabled = on; // fixed after results
}

function scheduleSearch({ resetPage = false, reason = "search" } = {}) {
  clearTimeout(searchTimer);
  if (resetPage) currentPage = 1;

  const mySearchId = ++activeSearchId;

  if (reason !== "page") {
    setMeta("Press Search to run your filters.");
  }

  searchTimer = setTimeout(() => {
    runSearch(mySearchId);
  }, SEARCH_DEBOUNCE_MS);
}

/* ====== Helpers ====== */
function scrollToDirectory() {
  els.directoryAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => els.stateSelect?.focus(), 200);
}

function safeText(v, fallback="—") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s ? s : fallback;
}

function safeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;

  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = (url.pathname || "/").toLowerCase();

    const blocked = new Set(["instagram.com", "facebook.com", "youtube.com", "x.com", "twitter.com", "linkedin.com"]);
    const isHomepage = path === "/" || path === "";
    if (blocked.has(host) && isHomepage) return null;

    return url.href;
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function nteeToService(nteeCode) {
  const code = (nteeCode || "").trim().toUpperCase();
  const letter = code ? code[0] : "";
  return NTEE_MAJOR[letter] || "General";
}

function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "OP";
  const a = parts[0][0] || "";
  const b = (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1]) || "";
  return (a + b).toUpperCase();
}

function googleQueryUrl(name, city, state) {
  const q = [name, city, state, "nonprofit"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/* ====== Select population ====== */
function populateStateSelect() {
  if (!els.stateSelect) return;
  els.stateSelect.innerHTML = STATES.map(([abbr, name]) => `<option value="${abbr}">${name}</option>`).join("");
}

function populateServiceSelect() {
  if (!els.serviceSelect) return;
  els.serviceSelect.innerHTML = SERVICE_OPTIONS.map(([v, label]) => `<option value="${v}">${label}</option>`).join("");
}

/* ====== Favorites ====== */
const FAV_KEY = "top_favorites_v2";

function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveFavs(arr) { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }
function isFav(ein) { return loadFavs().includes(String(ein)); }
function toggleFav(ein) {
  const id = String(ein);
  const favs = loadFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(id);
  saveFavs(favs.slice(0, 500));
}

/* ====== Link builders ====== */
function buildDirectoryLinks(r, isTrusted) {
  const links = [];
  const website = safeUrl(r[COL.website]);
  const ig = safeUrl(r[COL.instagram]);
  const fb = safeUrl(r[COL.facebook]);
  const yt = safeUrl(r[COL.youtube]);
  const x = safeUrl(r[COL.x]);
  const li = safeUrl(r[COL.linkedin]);

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

function buildTrustedLinksFromMerged(r) {
  const links = [];
  const website = safeUrl(r.website);
  const ig = safeUrl(r.instagram_url);
  const fb = safeUrl(r.facebook_url);
  const yt = safeUrl(r.youtube_url);
  const x = safeUrl(r.x_url);
  const li = safeUrl(r.linkedin_url);

  if (website) links.push({ label: "Website", url: website });
  if (ig) links.push({ label: "Instagram", url: ig });
  if (fb) links.push({ label: "Facebook", url: fb });
  if (yt) links.push({ label: "YouTube", url: yt });
  if (x) links.push({ label: "X", url: x });
  if (li) links.push({ label: "LinkedIn", url: li });
  return links;
}

/* ====== Render (directory) ====== */
function renderResults(rows) {
  if (!els.results) return;
  els.results.innerHTML = "";

  if (!rows || rows.length === 0) {
    els.results.innerHTML = `
      <div class="emptyState">
        <div class="emptyTitle">No matches</div>
        <div class="emptyText">Try a broader search (or a different service area).</div>
      </div>
    `;
    return;
  }

  for (const r of rows) {
    const name = safeText(r[COL.name], "Unknown Organization");
    const city = safeText(r[COL.city], "");
    const st = safeText(r[COL.state], "");
    const loc = [city, st].filter(Boolean).join(", ") || "Location not listed";

    const serviceLabel = nteeToService(r[COL.ntee]);
    const trusted = !!r[COL.is_trusted];
    const ein = safeText(r[COL.ein], "");
    const links = buildDirectoryLinks(r, trusted);
    const findUrl = googleQueryUrl(name, city, st);

    const favOn = ein ? isFav(ein) : false;

    const card = document.createElement("div");
    card.className = "resultCard";
    card.innerHTML = `
      ${ein ? `<button class="favCorner ${favOn ? "on" : ""}" type="button" data-fav="${escapeHtml(ein)}" aria-label="Favorite">${favOn ? "★" : "☆"}</button>` : ""}
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

    els.results.appendChild(card);
  }

  els.results.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ein = btn.getAttribute("data-fav");
      toggleFav(ein);
      btn.classList.toggle("on", isFav(ein));
      btn.textContent = isFav(ein) ? "★" : "☆";
      renderFavorites();
    });
  });
}

function renderMeta(totalCount, page, gotRows) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = from + Math.max(0, (gotRows || 0) - 1);

  if (gotRows) setStatus(`Showing ${from}-${to} (of ${totalCount})`);
  else setStatus("No results found.");

  setMeta(`Page ${page} • ${PAGE_SIZE} per page`);

  if (els.pageLabel) els.pageLabel.textContent = `Page ${page}`;
  if (els.prevBtn) els.prevBtn.disabled = isSearching || page <= 1;
  if (els.nextBtn) els.nextBtn.disabled = isSearching || (gotRows < PAGE_SIZE);
}

/* ====== SEARCH (directory) ====== */
function normalizeAudienceValue(v) {
  if (!v || v === "all") return null;
  return String(v).toLowerCase();
}

function buildSearchParams() {
  return {
    state: els.stateSelect?.value || "",
    q: (els.qInput?.value || "").trim(),
    serviceLetter: els.serviceSelect?.value || "",
    audience: normalizeAudienceValue(els.audienceSelect?.value || "all"),
    page: currentPage,
  };
}

function applyFiltersToQuery(q, params) {
  q = q.eq(COL.state, params.state);

  if (params.q) {
    const term = params.q.replace(/,/g, " ");
    q = q.or(`${COL.name}.ilike.%${term}%,${COL.city}.ilike.%${term}%`);
  }

  if (params.serviceLetter) q = q.ilike(COL.ntee, `${params.serviceLetter}%`);

  if (params.audience === "veteran") q = q.eq(COL.serves_veterans, true);
  else if (params.audience === "first_responder") q = q.eq(COL.serves_first, true);

  return q;
}

async function runSearch(searchId) {
  const myId = searchId;

  try {
    if (!sb) {
      setStatus("Supabase client not initialized.");
      setMeta("Make sure the Supabase CDN script loads BEFORE app.js.");
      return;
    }

    const params = buildSearchParams();

    if (!params.state) {
      setStatus("Please select a state.");
      setMeta("");
      if (els.results) els.results.innerHTML = "";
      return;
    }

    setControlsSearching(true);
    setStatus("Hold on tight — resources on the way…");
    setMeta("");

    const from = (params.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const selectCols = [
      COL.ein, COL.name, COL.city, COL.state, COL.ntee,
      COL.is_trusted, COL.serves_veterans, COL.serves_first,
      COL.website, COL.instagram, COL.facebook, COL.youtube, COL.x, COL.linkedin
    ].join(",");

    // STEP 1: page results (fast)
    let pageQuery = sb
      .from(DIRECTORY_SOURCE)
      .select(selectCols)
      .range(from, to);

    pageQuery = applyFiltersToQuery(pageQuery, params);

    const { data: rows, error: pageErr } = await pageQuery;

    // latest-result-wins
    if (myId !== activeSearchId) return;

    if (pageErr) {
      console.error("Supabase page error:", pageErr);

      const msg = String(pageErr.message || "").toLowerCase();
      if (msg.includes("statement timeout")) {
        setStatus("That search is too broad. Add a keyword or service area and try again.");
        setMeta("");
      } else {
        setStatus("Search failed. Please try again.");
        setMeta("");
      }

      if (els.results) els.results.innerHTML = "";
      return;
    }

    const data = rows || [];
    renderResults(data);

    // STEP 2: exact count (HEAD-only, lighter than full count on the page query)
    // NOTE: This can still be heavy on huge states — but it’s the safest “exact count” version.
    let countQuery = sb
      .from(DIRECTORY_SOURCE)
      .select(COL.ein, { count: "exact", head: true });

    countQuery = applyFiltersToQuery(countQuery, params);

    const { count, error: countErr } = await countQuery;

    if (myId !== activeSearchId) return;

    if (countErr) {
      // Don’t show user an error — we can still show results + paging without count
      console.warn("Count failed (hidden from user):", countErr);
      // fallback meta without count
      const shownFrom = data.length ? (from + 1) : 0;
      const shownTo = from + data.length;
      if (data.length) setStatus(`Showing ${shownFrom}-${shownTo}`);
      else setStatus("No results found.");
      setMeta(`Page ${params.page} • ${PAGE_SIZE} per page`);
      if (els.pageLabel) els.pageLabel.textContent = `Page ${params.page}`;
      if (els.prevBtn) els.prevBtn.disabled = isSearching || params.page <= 1;
      if (els.nextBtn) els.nextBtn.disabled = isSearching || (data.length < PAGE_SIZE);
      return;
    }

    renderMeta(typeof count === "number" ? count : 0, params.page, data.length);

  } catch (e) {
    if (myId !== activeSearchId) return;
    console.error(e);
    setStatus("Search failed. Please try again.");
    setMeta("");
    if (els.results) els.results.innerHTML = "";
  } finally {
    if (myId === activeSearchId) setControlsSearching(false);
  }
}

/* ====== TRUSTED (FAST PATH) ====== */
let trustedCache = [];
let trustedOffset = 0;
let trustedLoaded = false;

function clearTrusted() {
  trustedCache = [];
  trustedOffset = 0;
  trustedLoaded = false;
  if (els.trustedResults) els.trustedResults.innerHTML = "";
}

async function hydrateTrustedCache() {
  if (!sb) return;

  setTrustedStatus("Loading trusted resources…");

  const profSelect = [
    "ein","display_name_override","website","instagram_url","facebook_url","youtube_url",
    "x_url","linkedin_url","contact_email","phone","is_trusted"
  ].join(",");

  const { data: profiles, error: pErr } = await sb
    .from(TRUSTED_PROFILES_SOURCE)
    .select(profSelect)
    .eq("is_trusted", true)
    .limit(500);

  if (pErr) {
    setTrustedStatus("Unable to load trusted resources right now.");
    console.error(pErr);
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

  const orgSelect = ["ein","name","city","state","ntee_code"].join(",");
  const { data: orgs, error: oErr } = await sb
    .from(TRUSTED_ORGS_SOURCE)
    .select(orgSelect)
    .in("ein", eins);

  if (oErr) {
    setTrustedStatus("Unable to load trusted resources right now.");
    console.error(oErr);
    trustedLoaded = true;
    return;
  }

  const orgMap = new Map((orgs || []).map(o => [String(o.ein), o]));

  const merged = profRows.map(p => {
    const o = orgMap.get(String(p.ein)) || {};
    return {
      ein: p.ein,
      org_name: (p.display_name_override || o.name || "Trusted Resource"),
      city: o.city || "",
      state: o.state || "",
      ntee_code: o.ntee_code || "",
      website: p.website || "",
      instagram_url: p.instagram_url || "",
      facebook_url: p.facebook_url || "",
      youtube_url: p.youtube_url || "",
      x_url: p.x_url || "",
      linkedin_url: p.linkedin_url || "",
      contact_email: p.contact_email || "",
      phone: p.phone || ""
    };
  });

  merged.sort((a,b) => (a.org_name || "").localeCompare((b.org_name || ""), undefined, { sensitivity: "base" }));

  trustedCache = merged;
  trustedLoaded = true;
  setTrustedStatus("");
}

async function loadTrustedPage({ reset=false } = {}) {
  try {
    if (!sb) return;

    if (reset) clearTrusted();
    if (!trustedLoaded) await hydrateTrustedCache();
    if (!trustedCache.length) return;

    const slice = trustedCache.slice(trustedOffset, trustedOffset + TRUSTED_PAGE_SIZE);
    if (!slice.length && trustedOffset === 0) { setTrustedStatus("No trusted resources found yet."); return; }
    if (!slice.length) { setTrustedStatus("No more trusted resources."); return; }

    setTrustedStatus("");
    renderTrustedInto(slice);
    trustedOffset += slice.length;

  } catch (e) {
    setTrustedStatus("Unable to load trusted resources right now.");
    console.error(e);
  }
}

function renderTrustedInto(rows) {
  if (!els.trustedResults) return;

  for (const r of rows) {
    const name = safeText(r.org_name, "Trusted Resource");
    const city = safeText(r.city, "");
    const st = safeText(r.state, "");
    const loc = [city, st].filter(Boolean).join(", ") || "Nationwide";
    const serviceLabel = nteeToService(r.ntee_code);

    const links = buildTrustedLinksFromMerged(r);
    const findUrl = googleQueryUrl(name, city, st);

    const card = document.createElement("div");
    card.className = "resultCard";
    card.innerHTML = `
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
}

/* ====== Favorites render ====== */
async function renderFavorites() {
  if (!els.favoritesList) return;

  const favs = loadFavs();
  if (els.favoritesEmpty) els.favoritesEmpty.hidden = favs.length !== 0;
  els.favoritesList.innerHTML = "";

  if (!favs.length) return;

  if (!sb) {
    els.favoritesList.innerHTML = `<div class="emptyState"><div class="emptyText">Supabase not initialized.</div></div>`;
    return;
  }

  const chunkSize = 80;
  const allRows = [];
  for (let i = 0; i < favs.length; i += chunkSize) {
    const chunk = favs.slice(i, i + chunkSize);

    const selectCols = [
      COL.ein, COL.name, COL.city, COL.state, COL.ntee,
      COL.is_trusted, COL.website, COL.instagram, COL.facebook, COL.youtube, COL.x, COL.linkedin
    ].join(",");

    const { data, error } = await sb
      .from(DIRECTORY_SOURCE)
      .select(selectCols)
      .in(COL.ein, chunk);

    if (error) { console.error(error); continue; }
    if (data?.length) allRows.push(...data);
  }

  const byEin = new Map(allRows.map(r => [String(r[COL.ein]), r]));
  const ordered = favs.map(ein => byEin.get(String(ein))).filter(Boolean);

  renderResultsInto(ordered, els.favoritesList);
}

function renderResultsInto(rows, mountEl) {
  mountEl.innerHTML = "";
  for (const r of rows) {
    const name = safeText(r[COL.name], "Unknown Organization");
    const city = safeText(r[COL.city], "");
    const st = safeText(r[COL.state], "");
    const loc = [city, st].filter(Boolean).join(", ") || "Location not listed";
    const serviceLabel = nteeToService(r[COL.ntee]);
    const trusted = !!r[COL.is_trusted];
    const ein = safeText(r[COL.ein], "");

    const links = buildDirectoryLinks(r, trusted);
    const findUrl = googleQueryUrl(name, city, st);

    const card = document.createElement("div");
    card.className = "resultCard";
    card.innerHTML = `
      ${ein ? `<button class="favCorner on" type="button" data-fav="${escapeHtml(ein)}" aria-label="Unfavorite">★</button>` : ""}
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

  mountEl.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ein = btn.getAttribute("data-fav");
      toggleFav(ein);
      renderFavorites();
    });
  });
}

/* ====== NAV ====== */
function setActiveNav(nav) {
  els.navItems.forEach(b => b.classList.toggle("isActive", b.dataset.nav === nav));
  Object.values(els.sections).forEach(s => s?.classList.remove("isActive"));

  if (nav === "home") els.sections.home?.classList.add("isActive");
  if (nav === "trusted") els.sections.trusted?.classList.add("isActive");
  if (nav === "favorites") els.sections.favorites?.classList.add("isActive");
  if (nav === "profile") els.sections.profile?.classList.add("isActive");
  if (nav === "community") els.sections.community?.classList.add("isActive");
}

/* ====== Profile (local) ====== */
const PROFILE_KEY = "top_profile_v2";

function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return { name: "Welcome back.", role: "Supporter", city: "", state: "" };
  try { return JSON.parse(raw); }
  catch { return { name: "Welcome back.", role: "Supporter", city: "", state: "" }; }
}

function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

function renderProfile() {
  const p = loadProfile();

  if (els.profileName) els.profileName.textContent = p.name?.trim() || "Welcome back.";
  if (els.profileRole) els.profileRole.textContent = p.role || "Supporter";

  const loc = [p.city?.trim(), p.state?.trim()].filter(Boolean).join(", ");
  if (els.profileLoc) els.profileLoc.textContent = loc || "Set your location";

  if (els.profileNameInput) els.profileNameInput.value = p.name || "";
  if (els.profileRoleSelect) els.profileRoleSelect.value = p.role || "Supporter";
  if (els.profileCityInput) els.profileCityInput.value = p.city || "";
  if (els.profileStateInput) els.profileStateInput.value = p.state || "";

  if (els.avatarCircle) {
    const initials = initialsFromName(p.name || "OP");
    els.avatarCircle.innerHTML = `
      <img
        src="assets/top_profile_circle_1024.png"
        alt="Profile"
        style="width:100%;height:100%;object-fit:cover;border-radius:999px;"
        onerror="this.remove(); this.parentNode.textContent='${initials}';"
      />
    `;
  }

  if (els.profileMeta) els.profileMeta.textContent = "Saved locally on this device (no login required yet).";
}

/* ====== Events ====== */
function wireEvents() {
  // Bottom nav
  els.navItems.forEach(btn => btn.addEventListener("click", () => {
    setActiveNav(btn.dataset.nav);
    if (btn.dataset.nav === "favorites") renderFavorites();
    if (btn.dataset.nav === "trusted") loadTrustedPage({ reset: true });
  }));

  // Quick actions
  els.actionFindSupport?.addEventListener("click", () => scrollToDirectory());

  els.actionTrusted?.addEventListener("click", async () => {
    setActiveNav("trusted");
    await loadTrustedPage({ reset: true });
  });

  els.actionCommunity?.addEventListener("click", () => setActiveNav("community"));
  els.communityBackBtn?.addEventListener("click", () => setActiveNav("home"));

  els.actionPodcast?.addEventListener("click", () => {
    if (PODCAST_URL) window.open(PODCAST_URL, "_blank", "noopener");
  });

  // ✅ Search ONLY on button click
  els.searchBtn?.addEventListener("click", () => {
    scheduleSearch({ resetPage: true, reason: "search" });
  });

  // ✅ State change does NOT query
  els.stateSelect?.addEventListener("change", () => {
    currentPage = 1;
    if (!els.stateSelect.value) {
      if (els.results) els.results.innerHTML = "";
      setStatus("");
      setMeta("");
      return;
    }
    setStatus("Filters ready. Press Search.");
    setMeta("");
  });

  // When filters change, prompt user to press Search
  els.serviceSelect?.addEventListener("change", () => {
    currentPage = 1;
    if (els.stateSelect?.value) setStatus("Filters changed. Press Search.");
  });

  els.audienceSelect?.addEventListener("change", () => {
    currentPage = 1;
    if (els.stateSelect?.value) setStatus("Filters changed. Press Search.");
  });

  // Clear
  els.clearBtn?.addEventListener("click", () => {
    if (els.qInput) els.qInput.value = "";
    if (els.audienceSelect) els.audienceSelect.value = "all";
    if (els.serviceSelect) els.serviceSelect.value = "";
    if (els.stateSelect) els.stateSelect.value = "";
    currentPage = 1;

    if (els.results) els.results.innerHTML = "";
    setStatus("");
    setMeta("");
    scrollToDirectory();
  });

  // Pagination
  els.prevBtn?.addEventListener("click", () => {
    if (isSearching) return;
    if (currentPage <= 1) return;
    currentPage -= 1;
    scheduleSearch({ resetPage: false, reason: "page" });
  });

  els.nextBtn?.addEventListener("click", () => {
    if (isSearching) return;
    currentPage += 1;
    scheduleSearch({ resetPage: false, reason: "page" });
  });

  // Trusted buttons
  els.trustedRefreshBtn?.addEventListener("click", () => loadTrustedPage({ reset: true }));
  els.trustedMoreBtn?.addEventListener("click", () => loadTrustedPage({ reset: false }));

  // Profile buttons
  els.editProfileBtn?.addEventListener("click", () => setActiveNav("profile"));
  els.openProfileBtn?.addEventListener("click", () => setActiveNav("profile"));

  els.saveProfileBtn?.addEventListener("click", () => {
    const p = {
      name: (els.profileNameInput?.value || "").trim() || "Welcome back.",
      role: els.profileRoleSelect?.value || "Supporter",
      city: (els.profileCityInput?.value || "").trim(),
      state: (els.profileStateInput?.value || "").trim().toUpperCase(),
    };
    saveProfile(p);
    renderProfile();
    if (els.profileMeta) els.profileMeta.textContent = "Saved. Returning to Home…";
    setTimeout(() => setActiveNav("home"), 350);
  });

  els.resetProfileBtn?.addEventListener("click", () => {
    localStorage.removeItem(PROFILE_KEY);
    renderProfile();
    if (els.profileMeta) els.profileMeta.textContent = "Reset complete.";
  });

  els.favClearBtn?.addEventListener("click", () => {
    localStorage.removeItem(FAV_KEY);
    renderFavorites();
  });
}

/* ====== Init ====== */
function init() {
  populateStateSelect();
  populateServiceSelect();
  renderProfile();
  wireEvents();
  setActiveNav("home");

  if (!sb) {
    setStatus("Supabase client not initialized.");
    setMeta("Make sure Supabase CDN script is loaded before app.js in index.html.");
  }
}

init();