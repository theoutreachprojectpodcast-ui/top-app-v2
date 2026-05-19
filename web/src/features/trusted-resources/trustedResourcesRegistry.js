/**
 * Canonical Trusted Resources registry — single source of truth for display metadata (module: trustedResourcesRegistry).
 * Match order: EIN (row + profile + org) → official website hostname → strict name keys (+ host stems).
 *
 * Social URLs: include only org-verified presences. Partial overrides (e.g. Instagram only) use socialOverrides.
 *
 * ── Adding / importing a new Trusted Resource ─────────────────────────────────
 * 1. Add a record below with: eins (from IRS/profile), nameKeys (legal + common DB variants),
 *    slug, displayName (exact public-facing title — this string is shown verbatim in the UI),
 *    trustedResourceCategoryKey, shortDescription, locationLabel, website, ntee_code, nonprofit_type.
 * 2. Run: pnpm verify:trusted-resources  (must pass before merge; wired into prebuild).
 * 3. Spot-check the Trusted Resources tab: name, category, location, description, links.
 * 4. Optional curated art (same-origin under `/public/trusted/`):
 *    - `registryHeaderImageUrl` — wide hero / listing strip only, e.g. `/trusted/{slug}-hero.svg`
 *    - `registryLogoUrl` — organization mark for the card logo slot, e.g. `/trusted/{slug}-org-logo.png`
 *    Do not point both at the same file; hero art belongs in header fields, marks in logo/profile only.
 *
 * ── Curated art on disk (`/public/trusted/`) ───────────────────────────────────
 * Wide listing strips: generated `*-hero.svg` per slug. Organization marks: `*-org-logo.png` (curated raster marks).
 * Warrior's Refuge uses `warriors-refuge-logo.png` plus `warriors-refuge-hero.svg`.
 */

/** IRS EIN is 9 digits; DBs may pad or concatenate — normalize to exactly 9 digits. */
function normEin(ein) {
  let d = String(ein || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

function compactKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Normalized hostname without www (lowercase). */
export function canonicalHostname(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function collectHostsFromRow(row) {
  const hosts = new Set();
  const add = (u) => {
    const h = canonicalHostname(u);
    if (h) hosts.add(h);
  };
  add(row.website);
  const p = row.raw?.profile;
  const o = row.raw?.org;
  if (p) add(p.website);
  if (o) add(o.website);
  return [...hosts];
}

/** First label + registrable label as compact keys (hopeforthewarriors.org → hopeforthewarriors). */
function hostStemCompactKeys(url) {
  const h = canonicalHostname(url);
  if (!h) return [];
  const parts = h.split(".").filter(Boolean);
  const keys = new Set();
  if (parts[0]) keys.add(compactKey(parts[0]));
  if (parts.length >= 2) keys.add(compactKey(parts[parts.length - 2]));
  return [...keys].filter(Boolean);
}

function matchRecordByHosts(rowHosts) {
  for (const h of rowHosts) {
    const hit = TRUSTED_RESOURCE_BY_HOST.get(h);
    if (hit) return hit;
  }
  for (const h of rowHosts) {
    const parts = h.split(".").filter(Boolean);
    if (parts.length < 2) continue;
    for (let start = 0; start < parts.length - 1; start += 1) {
      const parent = parts.slice(start).join(".");
      const sub = TRUSTED_RESOURCE_BY_HOST.get(parent);
      if (sub) return sub;
    }
  }
  return null;
}

/**
 * @typedef {object} TrustedResourceSocialOverrides
 * @property {string} [instagramUrl]
 * @property {string} [facebookUrl]
 * @property {string} [youtubeUrl]
 * @property {string} [xUrl]
 * @property {string} [linkedinUrl]
 * @property {string} [tiktokUrl]
 */

/**
 * Canonical record shape (documented for editors; registry is the contract).
 *
 * @typedef {object} TrustedResourceCanonicalRecord
 * @property {string[]} [eins] Normalized EINs (digits only ok)
 * @property {string[]} [nameKeys] Lowercase phrases / compact tokens for matching
 * @property {string} slug Internal routing key (not shown in UI)
 * @property {string} displayName Authoritative user-facing title
 * @property {string} trustedResourceCategoryKey Key into NONPROFIT_CATEGORY_MAP (categoryMapper)
 * @property {string} shortDescription Card body copy
 * @property {string} locationLabel e.g. National or City, ST
 * @property {string} website Official site
 * @property {string[]} [aliasHosts] Extra hostnames that should map to this record (no scheme)
 * @property {string} [ntee_code] IRS NTEE major letter when known
 * @property {string} [nonprofit_type] Human category line for text-based inference
 * @property {TrustedResourceSocialOverrides} [socialOverrides] Verified URLs only; merges onto row
 * @property {boolean} [clearUnlistedSocials] When true, omit socials not listed in socialOverrides (website kept)
 * @property {string} [registryHeaderImageUrl] Same-origin path for listing-card hero strip only (e.g. `/trusted/{slug}-hero.svg`)
 * @property {string} [registryLogoUrl] Same-origin path for the trusted card logo slot (e.g. `/trusted/{slug}-org-logo.png`)
 */

/** @type {TrustedResourceCanonicalRecord[]} */
export const TRUSTED_RESOURCE_CANONICAL_RECORDS = [
  {
    eins: ["923487010"],
    nameKeys: ["say when and remember him", "saywhenandrememberhim"],
    slug: "say-when-and-remember-him",
    displayName: "Say When and Remember Him",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Memorial nonprofit raising trade-school scholarship funds and veteran-suicide awareness through community events honoring Seth M. Plant.",
    locationLabel: "St. Augustine, FL",
    website: "https://saywhenandrememberhim.org/",
    nonprofit_type: "Veteran and first responder support",
    registryHeaderImageUrl: "/trusted/say-when-and-remember-him-hero.png?v=1",
    registryLogoUrl: "/trusted/say-when-and-remember-him-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {
      /* Event recap (saywhenandrememberhim.org/2024/11/26/157/) directs to Facebook page "saywhenandrememberhim". */
      facebookUrl: "https://www.facebook.com/saywhenandrememberhim",
      /* Matching org handle; profile URL resolves — site contact page lists Instagram but uses a placeholder link. */
      instagramUrl: "https://www.instagram.com/saywhenandrememberhim/",
    },
  },
  {
    eins: ["993469766"],
    nameKeys: ["back country heroes", "backcountryheroes"],
    slug: "back-country-heroes",
    displayName: "Backcountry Heroes",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Provides outdoor sporting opportunities that build camaraderie, independence, and mental/physical healing for veterans, first responders, and families.",
    locationLabel: "National",
    website: "https://www.backcountryheroes.org/",
    nonprofit_type: "Veteran and first responder support",
    registryHeaderImageUrl: "/trusted/back-country-heroes-hero.png?v=1",
    registryLogoUrl: "/trusted/back-country-heroes-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {},
  },
  {
    eins: ["883575938"],
    nameKeys: ["hero to the line", "herototheline", "hero2theline"],
    slug: "hero-to-the-line",
    displayName: "Hero To The Line",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Supports veterans, active-duty members, and Gold Star families through Labrador service and working-dog placement, training, and community events.",
    locationLabel: "Huntsville, TX",
    website: "https://hero2theline.org/",
    nonprofit_type: "Veteran and Gold Star family support",
    clearUnlistedSocials: true,
    socialOverrides: {
      /* From hero2theline.org site footer (GoDaddy builder). */
      facebookUrl: "https://www.facebook.com/Hero2theline/",
      instagramUrl: "https://www.instagram.com/hero2theline/",
      xUrl: "https://x.com/HerototheLine",
    },
    registryHeaderImageUrl: "/trusted/hero-to-the-line-hero.png?v=1",
    registryLogoUrl: "/trusted/hero-to-the-line-org-logo.png",
  },
  {
    eins: ["412739043"],
    nameKeys: [
      "hero's journey healing foundation",
      "heros journey healing foundation",
      "herosjourneyhealingfoundation",
      "hero's journey",
      "heros journey",
    ],
    slug: "heros-journey-healing-foundation",
    displayName: "Heroes Journey Healing Foundation",
    trustedResourceCategoryKey: "healthWellness",
    shortDescription:
      "Provides free therapeutic adventures and community-based healing support for veterans, first responders, healthcare professionals, and spouses.",
    locationLabel: "National",
    website: "https://www.herosjourneyheals.org/",
    nonprofit_type: "Healing and wellness support",
    registryHeaderImageUrl: "/trusted/heros-journey-healing-foundation-hero.svg",
    registryLogoUrl: "/trusted/heros-journey-healing-foundation-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {},
  },
  {
    eins: ["541411430", "0541411430"],
    nameKeys: ["freedomalliance", "freedom alliance", "freedom alliance inc"],
    slug: "freedom-alliance",
    displayName: "Freedom Alliance",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Supports wounded service members and military families with care packages, scholarships, and morale programs.",
    locationLabel: "National",
    website: "https://www.freedomalliance.org/",
    ntee_code: "O",
    nonprofit_type: "Veterans & military families — scholarships, programs, and support",
    clearUnlistedSocials: true,
    socialOverrides: {
      // Official site (freedomalliance.org) links to this handle in page chrome — not a guessed handle.
      instagramUrl: "https://www.instagram.com/freedom.alliance/",
    },
    registryHeaderImageUrl: "/trusted/freedom-alliance-hero.svg",
    registryLogoUrl: "/trusted/freedom-alliance-org-logo.png",
  },
  {
    eins: ["813997855", "0813997855"],
    nameKeys: [
      "southern outdoor dreams",
      "southernoutdoordreams",
      "southern outdoor dreams inc",
      "southernoutdoordreamsorg",
      "snd",
    ],
    slug: "southern-outdoor-dreams",
    displayName: "Southern Outdoor Dreams",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Faith-based Texas nonprofit providing outdoor adventures and community for veterans, youth, and others facing physical health challenges.",
    locationLabel: "Angleton, TX",
    website: "https://www.southernoutdoordreams.org/",
    ntee_code: "P",
    nonprofit_type: "Outdoor experiences for veterans, youth, and heroes with health challenges",
    registryHeaderImageUrl: "/trusted/southern-outdoor-dreams-hero.png?v=1",
    registryLogoUrl: "/trusted/southern-outdoor-dreams-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {},
  },
  {
    eins: ["474655361"],
    nameKeys: ["frontline healing foundation", "frontlinehealingfoundation"],
    slug: "frontline-healing-foundation",
    displayName: "Frontline Healing Foundation",
    trustedResourceCategoryKey: "healthWellness",
    shortDescription:
      "Removes financial barriers to critical care for active-duty military, veterans, and first responders, including treatment support for PTS, addiction, and TBI.",
    locationLabel: "Bandera, TX",
    website: "https://frontlinehealingfoundation.org/",
    nonprofit_type: "Behavioral health and recovery support",
    clearUnlistedSocials: true,
    socialOverrides: {
      facebookUrl: "https://www.facebook.com/frontlinehealingfoundation",
      instagramUrl: "https://www.instagram.com/frontlinehealingfoundation/",
    },
    registryHeaderImageUrl: "/trusted/frontline-healing-foundation-hero.svg",
    registryLogoUrl: "/trusted/frontline-healing-foundation-org-logo.png",
  },
  {
    eins: ["823021911"],
    nameKeys: ["hometown hero outdoors", "hometownherooutdoors"],
    slug: "hometown-hero-outdoors",
    displayName: "Hometown Hero Outdoors",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "National 501(c)(3) delivering peer-led outdoor experiences that promote connection, resilience, and healing for veterans and first responders.",
    locationLabel: "Stillwater, MN",
    website: "https://www.hometownherooutdoors.org/",
    nonprofit_type: "Veteran and first responder outdoor wellness",
    clearUnlistedSocials: true,
    socialOverrides: {
      facebookUrl: "https://www.facebook.com/HometownHeroOutdoors/",
      instagramUrl: "https://www.instagram.com/hometownherooutdoors/",
      youtubeUrl: "https://www.youtube.com/@HometownHeroOutdoors",
    },
    registryHeaderImageUrl: "/trusted/hometown-hero-outdoors-hero.svg",
    registryLogoUrl: "/trusted/hometown-hero-outdoors-org-logo.png",
  },
  {
    nameKeys: ["veterans creed outdoors", "veteranscreedoutdoors", "veterans creed", "vcousa"],
    slug: "veterans-creed-outdoors",
    displayName: "Veterans Creed Outdoors",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "501(c)(3) volunteer nonprofit connecting veterans and first responders with hunting, fishing, and outdoor adventures to build resilience and camaraderie across state chapters.",
    locationLabel: "Multi-state, U.S. (see vcousa.org chapters)",
    website: "https://www.vcousa.org/",
    nonprofit_type: "Veteran and first responder outdoor experiences",
    registryHeaderImageUrl: "/trusted/veterans-creed-outdoors-hero.svg",
    registryLogoUrl: "/trusted/veterans-creed-outdoors-org-logo.png",
  },
  {
    nameKeys: ["the warriors refuge", "warriors refuge", "warriorsrefuge", "warrior's refuge"],
    slug: "warriors-refuge",
    displayName: "Warrior's Refuge",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Texas-based 501(c)(3) providing transitional housing, counseling, and employment support for veterans experiencing homelessness and crisis.",
    locationLabel: "West Columbia, TX",
    website: "https://thewarriorsrefuge.us/",
    nonprofit_type: "Veteran housing and crisis recovery",
    registryHeaderImageUrl: "/trusted/warriors-refuge-hero.svg",
    registryLogoUrl: "/trusted/warriors-refuge-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {},
  },
  {
    nameKeys: ["hoof to heart", "hooftoheart", "hoof to heart veterans", "hooftoheartvets"],
    slug: "hoof-to-heart-veterans",
    displayName: "Hoof to Heart Veterans",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Veteran-founded nonprofit offering equine-facilitated learning and groundwork programs for veterans and first responders at no cost.",
    locationLabel: "Southwick, MA",
    website: "https://hooftoheartvets.com/",
    nonprofit_type: "Equine-assisted veteran wellness",
    registryHeaderImageUrl: "/trusted/hoof-to-heart-veterans-hero.svg",
    registryLogoUrl: "/trusted/hoof-to-heart-veterans-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {},
  },
  {
    nameKeys: ["mos veteran adventures", "mosveteranadventures", "m o s veteran adventures"],
    slug: "mos-veteran-adventures",
    displayName: "M.O.S. Veteran Adventures",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Arizona-based nonprofit organizing outdoor adventures plus support services for disabled veterans including recreation, rehabilitation navigation, and community events.",
    locationLabel: "Glendale, AZ",
    website: "https://mosveteranadventures.com/",
    nonprofit_type: "Disabled veteran outdoor adventures",
    registryHeaderImageUrl: "/trusted/mos-veteran-adventures-hero.svg",
    registryLogoUrl: "/trusted/mos-veteran-adventures-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {},
  },
  {
    nameKeys: ["the fallen outdoors", "thefallenoutdoors", "fallen outdoors"],
    slug: "the-fallen-outdoors",
    displayName: "The Fallen Outdoors",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "National nonprofit coordinating volunteer-led outdoor adventures for veterans, active-duty members, and Gold Star families at no cost nationwide.",
    locationLabel: "National",
    website: "https://thefallenoutdoors.org/",
    nonprofit_type: "Outdoor adventures for veterans and Gold Star families",
    registryHeaderImageUrl: "/trusted/the-fallen-outdoors-hero.svg",
    registryLogoUrl: "/trusted/the-fallen-outdoors-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {
      /* Official TFO posts use this Facebook page slug (see facebook.com/thefallenoutdoors). */
      facebookUrl: "https://www.facebook.com/thefallenoutdoors/",
    },
  },
  {
    nameKeys: ["sheepdog impact assistance", "sheep dog impact assistance", "sheepdogia", "sdia"],
    slug: "sheepdog-impact-assistance",
    displayName: "Sheepdog Impact Assistance",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "National nonprofit engaging veterans and first responders through outdoor adventures, resilience programming, and disaster response volunteer missions.",
    locationLabel: "Rogers, AR",
    website: "https://sheepdogia.org/",
    nonprofit_type: "Veteran and first responder empowerment",
    registryHeaderImageUrl: "/trusted/sheepdog-impact-assistance-hero.svg",
    registryLogoUrl: "/trusted/sheepdog-impact-assistance-org-logo.png",
    clearUnlistedSocials: true,
    socialOverrides: {
      /* Official SDIA news links these handles (sheepdogia.org/news/...instagram...). */
      facebookUrl: "https://www.facebook.com/SheepDogIA/",
      instagramUrl: "https://www.instagram.com/sheepdog_ia/",
    },
  },
];

const TRUSTED_RESOURCE_BY_HOST = new Map();
for (const rec of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
  const primary = canonicalHostname(rec.website);
  if (primary) TRUSTED_RESOURCE_BY_HOST.set(primary, rec);
  for (const a of rec.aliasHosts || []) {
    const h = canonicalHostname(a.includes("://") ? a : `https://${a}/`);
    if (h) TRUSTED_RESOURCE_BY_HOST.set(h, rec);
  }
}

/**
 * One compact candidate (row org, profile, or directory org) vs a single rule key.
 * @param {string} nk
 * @param {string} ck
 */
function compactNameMatchesKey(nk, ck) {
  if (!nk || !ck) return false;
  if (nk === ck) return true;
  if (ck.length < 4) return nk === ck;
  if (ck.length >= 6) return nk.includes(ck);
  if (ck.length >= 4 && ck.length <= 5) return nk.startsWith(ck);
  return false;
}

/**
 * Avoid false positives (e.g. "uso" inside unrelated compact names) unless key is long / exact / prefix of whole name.
 * @param {string[]} compactCandidates orgName, profile names, directory org names (compactKey)
 * @param {string[]} nameKeys
 */
export function trustedResourceNameKeysMatch(compactCandidates, nameKeys) {
  const list = compactCandidates.filter(Boolean);
  for (const raw of nameKeys) {
    const ck = compactKey(raw);
    if (!ck) continue;
    for (const nk of list) {
      if (compactNameMatchesKey(nk, ck)) return true;
    }
  }
  return false;
}

/**
 * @param {object} row Trusted / profile row shape (ein, orgName, raw.profile)
 * @returns {TrustedResourceCanonicalRecord | null}
 */
export function matchCanonicalTrustedResource(row = {}) {
  const profile = row.raw?.profile || {};
  const org = row.raw?.org || {};
  const einK = normEin(row.ein || profile.ein || org.ein || "");

  for (const record of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
    if (einK && Array.isArray(record.eins) && record.eins.length) {
      const hitEin = record.eins.some((e) => normEin(e) === einK);
      if (hitEin) return record;
    }
  }

  const rowHosts = collectHostsFromRow(row);
  const hostHit = matchRecordByHosts(rowHosts);
  if (hostHit) return hostHit;

  const nameK = compactKey(row.orgName || "");
  const profileNameK = compactKey(
    profile.organization_name || profile.display_name_override || profile.legal_name || profile.org_name || profile.name || ""
  );
  const orgTableNameK = compactKey(
    org.organization_name || org.org_name || org.name || org.NAME || org.orgName || ""
  );
  const stems = [
    ...hostStemCompactKeys(row.website),
    ...hostStemCompactKeys(profile.website),
    ...hostStemCompactKeys(org.website),
  ];
  const compactCandidates = [...new Set([nameK, profileNameK, orgTableNameK, ...stems].filter(Boolean))];

  for (const record of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
    if (record.nameKeys?.length && trustedResourceNameKeysMatch(compactCandidates, record.nameKeys)) {
      return record;
    }
  }

  const displayCompacts = TRUSTED_RESOURCE_CANONICAL_RECORDS.map((r) => compactKey(r.displayName || "")).filter(Boolean);
  for (let i = 0; i < TRUSTED_RESOURCE_CANONICAL_RECORDS.length; i += 1) {
    const dc = displayCompacts[i];
    if (!dc) continue;
    if (compactCandidates.includes(dc)) {
      return TRUSTED_RESOURCE_CANONICAL_RECORDS[i];
    }
  }

  return null;
}

export { normEin as normalizeTrustedResourceEin, compactKey as compactTrustedResourceKey };
