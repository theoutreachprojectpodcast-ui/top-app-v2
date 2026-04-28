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
    eins: ["541411430", "0541411430"],
    nameKeys: [
      "freedomalliance",
      "freedom alliance",
      "freedomallianceorg",
      "freedom alliance org",
      "freedom alliance inc",
    ],
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
    eins: ["200956378", "0200956378"],
    nameKeys: [
      "woundedwarrior",
      "wounded warrior",
      "wounded warriors",
      "wwp",
      "woundedwarriorproject",
      "wounded warrior project",
      "wounded warrior project inc",
    ],
    slug: "wounded-warrior-project",
    displayName: "Wounded Warrior Project",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription: "Life-changing programs for injured veterans and their families.",
    locationLabel: "National",
    website: "https://www.woundedwarriorproject.org/",
    aliasHosts: ["wwp.org", "woundedwarriorproject.org"],
    ntee_code: "P",
    nonprofit_type: "Veterans mental health and wellness programs",
  },
  {
    eins: ["113158401"],
    nameKeys: [
      "fisherhouse",
      "fisher house",
      "fisherhousefoundation",
      "fisher house foundation",
      "fisher house foundation inc",
    ],
    slug: "fisher-house-foundation",
    displayName: "Fisher House Foundation",
    trustedResourceCategoryKey: "humanServices",
    shortDescription:
      "Comfort homes where military and veterans families stay at no cost while a loved one is in hospital.",
    locationLabel: "National",
    website: "https://fisherhouse.org/",
    ntee_code: "E",
    nonprofit_type: "Housing for military and veterans families near medical centers",
  },
  {
    eins: ["131637529", "0131637529"],
    nameKeys: [
      "uso",
      "unitedserviceorganizations",
      "united service organizations",
      "united service organizations inc",
      "theuso",
      "the uso",
    ],
    slug: "uso",
    displayName: "USO",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription: "Strengthens service members by keeping them connected to family, home and country.",
    locationLabel: "National",
    website: "https://www.uso.org/",
    ntee_code: "W",
    nonprofit_type: "Morale and welfare for service members",
  },
  {
    eins: ["272814901", "0272814901"],
    nameKeys: [
      "teamrubicon",
      "team rubicon",
      "team rubicon usa",
      "teamrubiconusa",
      "team rubicon inc",
    ],
    slug: "team-rubicon",
    displayName: "Team Rubicon",
    trustedResourceCategoryKey: "firstRespondersSafety",
    shortDescription: "Unites military veterans with first responders to deploy emergency response teams.",
    locationLabel: "National",
    website: "https://teamrubiconusa.org/",
    aliasHosts: ["teamrubicon.org", "www.teamrubicon.org"],
    ntee_code: "M",
    nonprofit_type: "Veteran-led disaster response",
  },
  {
    eins: ["208662493", "0208662493"],
    nameKeys: [
      "themissioncontinues",
      "missioncontinues",
      "mission continues",
      "the mission continues",
      "mission continues inc",
      "themissioncontinuesorg",
    ],
    slug: "the-mission-continues",
    displayName: "The Mission Continues",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription: "Empowers veterans to continue their service through community impact projects.",
    locationLabel: "National",
    website: "https://missioncontinues.org/",
    ntee_code: "O",
    nonprofit_type: "Veteran volunteer service and leadership",
  },
  {
    eins: ["261692660", "0261692660"],
    nameKeys: [
      "bobwoodruff",
      "woodruff foundation",
      "bob woodruff foundation",
      "bobwoodrufffoundation",
      "bob woodruff foundation inc",
    ],
    slug: "bob-woodruff-foundation",
    displayName: "Bob Woodruff Foundation",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription:
      "Invests in programs that help impacted veterans, service members, and their families thrive.",
    locationLabel: "National",
    website: "https://bobwoodrufffoundation.org/",
    ntee_code: "O",
    nonprofit_type: "Veterans and military families support",
  },
  {
    eins: ["262510017", "0262510017"],
    nameKeys: [
      "hireheroes",
      "hire our heroes",
      "hireheroesusa",
      "hire heroes usa",
      "hire heroes usa inc",
      "hireheroesusainc",
    ],
    slug: "hire-heroes-usa",
    displayName: "Hire Heroes USA",
    trustedResourceCategoryKey: "education",
    shortDescription: "Free job search support and career coaching for transitioning military members and veterans.",
    locationLabel: "National",
    website: "https://www.hireheroesusa.org/",
    ntee_code: "J",
    nonprofit_type: "Veteran employment and career transition",
  },
  {
    eins: ["020555664", "20555664", "0200555664"],
    nameKeys: [
      "tunneltotowers",
      "tunnel to towers",
      "t2t",
      "tunnel2towers",
      "tunnel to towers foundation",
      "stephen siller tunnel to towers foundation",
      "stephensiller",
      "stephen siller",
      "tunnels to towers",
    ],
    slug: "tunnel-to-towers",
    displayName: "Tunnel to Towers Foundation",
    trustedResourceCategoryKey: "humanServices",
    shortDescription:
      "Builds mortgage-free smart homes for veterans and first responders with life-changing injuries.",
    locationLabel: "National",
    website: "https://t2t.org/",
    ntee_code: "L",
    nonprofit_type: "Housing for catastrophically injured veterans and first responders",
  },
  {
    eins: ["272936269", "0272936269"],
    nameKeys: [
      "greenberet",
      "green beret foundation",
      "greenberetfoundation",
      "the green beret foundation",
      "green beret foundation inc",
    ],
    slug: "green-beret-foundation",
    displayName: "Green Beret Foundation",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription: "Provides support for U.S. Army Special Forces soldiers and their families.",
    locationLabel: "National",
    website: "https://greenberetfoundation.org/",
    ntee_code: "O",
    nonprofit_type: "Special Forces soldiers and families",
  },
  {
    eins: ["261981357", "0261981357"],
    nameKeys: [
      "travismanion",
      "travis manion foundation",
      "travismanionfoundation",
      "travis manion foundation inc",
    ],
    slug: "travis-manion-foundation",
    displayName: "Travis Manion Foundation",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription: "Develops character in future generations and empowers veterans and families.",
    locationLabel: "National",
    website: "https://www.travismanion.org/",
    ntee_code: "O",
    nonprofit_type: "Veteran and family character development",
  },
  {
    eins: ["205182298", "0205182298"],
    nameKeys: [
      "hopeforthewarriors",
      "hope for the warriors",
      "hope for the warriors inc",
      "hopeforthewarriorsinc",
      "hope for warriors",
    ],
    slug: "hope-for-the-warriors",
    displayName: "Hope For The Warriors",
    trustedResourceCategoryKey: "veteransMilitary",
    shortDescription: "Comprehensive programs for post-9/11 service members, veterans, and military families.",
    locationLabel: "National",
    website: "https://hopeforthewarriors.org/",
    ntee_code: "P",
    nonprofit_type: "Veteran wellness and military family support",
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
    website: "https://southernoutdoordreams.org/",
    ntee_code: "P",
    nonprofit_type: "Outdoor experiences for veterans, youth, and heroes with health challenges",
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
