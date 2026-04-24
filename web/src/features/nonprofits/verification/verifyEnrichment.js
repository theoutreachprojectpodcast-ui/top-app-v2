/**
 * Rule-based verification: align extracted website signals with the canonical nonprofit record.
 * Only fields/links that pass gates should be persisted or shown as "verified".
 */

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s) {
  const stop = new Set(["the", "and", "inc", "llc", "corp", "foundation", "org", "nonprofit", "of", "for", "a", "an"]);
  return new Set(
    normalizeName(s)
      .split(" ")
      .filter((w) => w.length > 1 && !stop.has(w))
  );
}

/**
 * @returns {number} 0–1
 */
export function nameAlignmentScore(canonicalName, ...candidates) {
  const canon = normalizeName(canonicalName);
  if (!canon) return 0;
  const canonTokens = tokenSet(canonicalName);
  let best = 0;
  for (const c of candidates) {
    const t = normalizeName(c);
    if (!t) continue;
    if (t.includes(canon) || canon.includes(t)) {
      best = Math.max(best, 0.92);
      continue;
    }
    const candTokens = tokenSet(c);
    if (!canonTokens.size || !candTokens.size) continue;
    let overlap = 0;
    for (const w of candTokens) {
      if (canonTokens.has(w)) overlap += 1;
    }
    const j = overlap / Math.max(canonTokens.size, candTokens.size);
    best = Math.max(best, j);
  }
  return Math.min(1, best);
}

function hostnameMatchesRecordWebsite(recordWebsite, fetchUrl) {
  try {
    const a = new URL(recordWebsite.startsWith("http") ? recordWebsite : `https://${recordWebsite}`);
    const b = new URL(fetchUrl);
    const ha = a.hostname.replace(/^www\./i, "").toLowerCase();
    const hb = b.hostname.replace(/^www\./i, "").toLowerCase();
    return ha === hb;
  } catch {
    return false;
  }
}

function socialSlugFromUrl(platform, url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) return "";
    if (platform === "facebook") return parts.join("-").toLowerCase();
    if (platform === "instagram") return parts[0].replace(/^@/, "").toLowerCase();
    if (platform === "linkedin") return parts[parts.length - 1].toLowerCase();
    if (platform === "x") return parts[0].toLowerCase();
    if (platform === "youtube") return path.toLowerCase();
    if (platform === "tiktok") return parts[0].replace(/^@/, "").toLowerCase();
    return path.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * @param {object} params
 * @param {string} params.canonicalName
 * @param {string} [params.recordWebsite]
 * @param {string} params.fetchFinalUrl
 * @param {object} extracted - from extractFromHtml
 */
export function verifyEnrichmentAgainstRecord(params, extracted) {
  const { canonicalName, recordWebsite, fetchFinalUrl } = params;
  const notes = [];
  const domainOk = recordWebsite
    ? hostnameMatchesRecordWebsite(recordWebsite, fetchFinalUrl)
    : true;
  if (recordWebsite && !domainOk) {
    notes.push("fetched_host_mismatch_record_website");
  }

  const nameScore = nameAlignmentScore(
    canonicalName,
    extracted.ogTitle,
    extracted.pageTitle,
    extracted.h1,
    extracted.metaDescription?.slice(0, 120)
  );
  const nameOk = nameScore >= 0.35;
  if (!nameOk) notes.push("weak_name_alignment");

  let textBlob = [extracted.metaDescription, extracted.aboutText, extracted.jsonLdDescription].filter(Boolean).join(" ");
  const textScore = nameAlignmentScore(canonicalName, textBlob.slice(0, 500));
  let textOk = textScore >= 0.25 || textBlob.length < 40;
  if (!textOk && String(extracted.jsonLdDescription || "").trim().length >= 80) {
    textOk = nameAlignmentScore(canonicalName, extracted.jsonLdDescription.slice(0, 400)) >= 0.2;
    if (textOk) notes.push("json_ld_description_relaxed_body_gate");
  }
  if (!textOk) notes.push("weak_body_alignment");

  const allowContent = domainOk && nameOk && textOk;

  /** @type {Record<string, { url: string, verified: boolean }>} */
  const socials = {};
  const nameTokens = normalizeName(canonicalName).replace(/\s+/g, "");
  const jsonLdTrust = new Set(
    (extracted.jsonLdSameAs || []).map((u) => String(u).trim().split("#")[0].toLowerCase())
  );

  for (const { platform, url } of extracted.socialCandidates || []) {
    const normalized = String(url).trim().split("#")[0];
    const inJsonLd = jsonLdTrust.has(normalized.toLowerCase());
    const slug = socialSlugFromUrl(platform, url).replace(/[^a-z0-9]/g, "");
    const slugScore = slug && nameTokens.includes(slug.slice(0, Math.min(6, slug.length))) ? 0.85 : 0;
    const loose = nameAlignmentScore(canonicalName, slug.replace(/-/g, " "));
    const socialOk = domainOk && (inJsonLd || slugScore >= 0.5 || loose >= 0.45);
    socials[platform] = { url, verified: socialOk };
    if (!socialOk) notes.push(`social_rejected_${platform}`);
    if (inJsonLd && socialOk) notes.push(`social_jsonld_sameas_${platform}`);
  }

  const headline =
    allowContent && extracted.ogTitle
      ? extracted.ogTitle.slice(0, 220)
      : allowContent && extracted.h1
        ? extracted.h1.slice(0, 220)
        : "";
  const tagline =
    allowContent && extracted.metaDescription
      ? extracted.metaDescription.slice(0, 160)
      : "";

  let shortDescription = "";
  if (allowContent) {
    shortDescription = (extracted.metaDescription || "").trim().slice(0, 360);
    if (shortDescription.length < 40 && extracted.aboutText) {
      shortDescription = extracted.aboutText.slice(0, 360);
    }
    if (shortDescription.length < 60 && extracted.jsonLdDescription) {
      const jd = String(extracted.jsonLdDescription).trim();
      shortDescription = shortDescription.length ? `${shortDescription} ${jd}`.trim().slice(0, 480) : jd.slice(0, 480);
    }
  }

  const longBody = (() => {
    const about = String(extracted.aboutText || "").trim();
    const jd = String(extracted.jsonLdDescription || "").trim();
    if (!about) return jd.slice(0, 8000);
    if (!jd) return about.slice(0, 8000);
    return about.length >= jd.length ? about.slice(0, 8000) : jd.slice(0, 8000);
  })();
  const longDescription =
    allowContent && longBody && longBody.length > shortDescription.length ? longBody.slice(0, 8000) : "";

  const missionGuess = allowContent
    ? pickMissionSentence(extracted.aboutText || extracted.jsonLdDescription || extracted.metaDescription)
    : "";

  const ogImg =
    allowContent && extracted.ogImage && /^https?:\/\//i.test(String(extracted.ogImage).trim())
      ? String(extracted.ogImage).trim()
      : "";
  const twImg =
    allowContent && extracted.twitterImage && /^https?:\/\//i.test(String(extracted.twitterImage).trim())
      ? String(extracted.twitterImage).trim()
      : "";

  function pathnameLikelyLogoOrIconAsset(url) {
    try {
      const p = new URL(String(url).trim()).pathname.toLowerCase();
      return /(logo|brand|mark|favicon|apple-touch|site-icon|\/icons?\/|sprite|avatar)\b/i.test(p);
    } catch {
      return false;
    }
  }

  /**
   * Prefer Twitter card when it does not look like a logo URL; otherwise fall back to OG if that looks like a hero.
   */
  let heroImageUrl = null;
  if (twImg && !pathnameLikelyLogoOrIconAsset(twImg)) {
    heroImageUrl = twImg;
  } else if (twImg && ogImg && !pathnameLikelyLogoOrIconAsset(ogImg)) {
    heroImageUrl = ogImg;
    notes.push("twitter_image_looks_like_logo_used_og_hero");
  } else if (twImg) {
    heroImageUrl = twImg;
  } else if (ogImg && !pathnameLikelyLogoOrIconAsset(ogImg)) {
    heroImageUrl = ogImg;
  } else if (ogImg) {
    notes.push("og_image_looks_like_logo_skipped_for_hero");
  }

  /** Only treat OG/Twitter URLs as verified logos when the path looks like a logo asset (not a default OG hero). */
  let logoImageUrl = null;
  const jsonLdLogo = String(extracted.jsonLdLogoUrl || "").trim();
  if (jsonLdLogo && /^https?:\/\//i.test(jsonLdLogo) && allowContent) {
    logoImageUrl = jsonLdLogo;
    notes.push("logo_from_json_ld");
  }
  if (!logoImageUrl && ogImg && pathnameLikelyLogoOrIconAsset(ogImg)) logoImageUrl = ogImg;
  else if (!logoImageUrl && twImg && pathnameLikelyLogoOrIconAsset(twImg)) logoImageUrl = twImg;
  const appleIcon = String(extracted.appleTouchIconUrl || "").trim();
  if (!logoImageUrl && appleIcon && /^https?:\/\//i.test(appleIcon) && allowContent) {
    logoImageUrl = appleIcon;
    notes.push("logo_from_apple_touch_icon");
  }

  const thumbnailUrl = heroImageUrl || logoImageUrl || null;

  return {
    ok: allowContent,
    confidence: Math.min(1, (nameScore + (domainOk ? 0.25 : 0) + (textOk ? 0.15 : 0)) / 1.2),
    notes,
    verified: {
      headline: headline || null,
      tagline: tagline || null,
      short_description: shortDescription || null,
      long_description: longDescription || null,
      mission_statement: missionGuess || null,
      logo_url: logoImageUrl || null,
      hero_image_url: heroImageUrl || null,
      thumbnail_url: thumbnailUrl,
      website_url: fetchFinalUrl,
      socials,
    },
  };
}

function pickMissionSentence(blob) {
  const t = String(blob || "").trim();
  if (!t) return "";
  const sentences = t.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const u = s.trim();
    if (u.length > 40 && u.length < 400) return u;
  }
  return t.slice(0, 280);
}
