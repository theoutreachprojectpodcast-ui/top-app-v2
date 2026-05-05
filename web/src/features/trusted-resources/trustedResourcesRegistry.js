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
 */

/** @type {TrustedResourceCanonicalRecord[]} */
export const TRUSTED_RESOURCE_CANONICAL_RECORDS = [
  {
    nameKeys: ["say when and remember him", "saywhenandrememberhim"],
    slug: "say-when-and-remember-him",
    displayName: "Say When and Remember Him",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Memorial nonprofit raising trade-school scholarship funds and veteran-suicide awareness through community events honoring Seth M. Plant.",
    locationLabel: "St. Augustine, FL",
    website: "https://saywhenandrememberhim.org/",
    nonprofit_type: "Veteran and first responder support",
  },
  {
    nameKeys: ["back country heroes", "backcountryheroes"],
    slug: "back-country-heroes",
    displayName: "Back Country Heroes",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Provides outdoor sporting opportunities that build camaraderie, independence, and mental/physical healing for veterans, first responders, and families.",
    locationLabel: "National",
    website: "https://www.backcountryheroes.org/",
    nonprofit_type: "Veteran and first responder support",
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
  },
  {
    nameKeys: ["hero's journey healing foundation", "heros journey healing foundation", "herosjourneyhealingfoundation"],
    slug: "heros-journey-healing-foundation",
    displayName: "Hero’s Journey Healing Foundation",
    trustedResourceCategoryKey: "healthWellness",
    shortDescription:
      "Provides free therapeutic adventures and community-based healing support for veterans, first responders, healthcare professionals, and spouses.",
    locationLabel: "National",
    website: "https://www.herosjourneyheals.org/",
    nonprofit_type: "Healing and wellness support",
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
    socialOverrides: {
      // Official site (freedomalliance.org) links to this handle in page chrome — not a guessed handle.
      instagramUrl: "https://www.instagram.com/freedom.alliance/",
    },
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
  },
  {
    nameKeys: ["hometown hero outdoors", "hometownherooutdoors"],
    slug: "hometown-hero-outdoors",
    displayName: "Hometown Hero Outdoors",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "National 501(c)(3) delivering peer-led outdoor experiences that promote connection, resilience, and healing for veterans and first responders.",
    locationLabel: "Stillwater, MN",
    website: "https://www.hometownherooutdoors.org/",
    nonprofit_type: "Veteran and first responder outdoor wellness",
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
