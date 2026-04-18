import { safeUrl } from "@/lib/utils";

function socialUrlHasAccountPath(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+/g, "/").replace(/\/$/, "");
    return path.length > 1;
  } catch {
    return false;
  }
}

function platformVerified(row, type) {
  const camel = {
    facebook: "facebookVerified",
    instagram: "instagramVerified",
    linkedin: "linkedinVerified",
    x: "xVerified",
    youtube: "youtubeVerified",
    tiktok: "tiktokVerified",
  };
  const snake = {
    facebook: "facebook_verified",
    instagram: "instagram_verified",
    linkedin: "linkedin_verified",
    x: "x_verified",
    youtube: "youtube_verified",
    tiktok: "tiktok_verified",
  };
  const ck = camel[type];
  const sk = snake[type];
  if (ck && row[ck]) return true;
  if (sk && row[sk]) return true;
  return false;
}

/**
 * @param {object} row — mapped directory/trusted row (camelCase URLs + Verified flags)
 * @param {{ trustMode?: 'directory' | 'curated' }} options — directory requires per-platform verification flags
 */
export function mapNonprofitLinks(row = {}, options = {}) {
  const strict = options.trustMode === "directory";

  const candidates = [
    { type: "website", label: "Website", url: safeUrl(row.website) },
    { type: "facebook", label: "Facebook", url: safeUrl(row.facebookUrl ?? row.facebook_url) },
    { type: "instagram", label: "Instagram", url: safeUrl(row.instagramUrl ?? row.instagram_url) },
    { type: "youtube", label: "YouTube", url: safeUrl(row.youtubeUrl ?? row.youtube_url) },
    { type: "x", label: "X", url: safeUrl(row.xUrl ?? row.x_url) },
    { type: "linkedin", label: "LinkedIn", url: safeUrl(row.linkedinUrl ?? row.linkedin_url) },
    { type: "tiktok", label: "TikTok", url: safeUrl(row.tiktokUrl ?? row.tiktok_url) },
  ];

  return candidates.filter((l) => {
    if (!l.url) return false;
    if (l.type === "website") return true;
    if (!socialUrlHasAccountPath(l.url)) return false;
    if (strict && !platformVerified(row, l.type)) return false;
    return true;
  });
}
