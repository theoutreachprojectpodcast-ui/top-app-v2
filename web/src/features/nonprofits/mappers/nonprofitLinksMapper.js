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

export function mapNonprofitLinks(row = {}) {
  const links = [
    { type: "website", label: "Website", url: safeUrl(row.website) },
    { type: "facebook", label: "Facebook", url: safeUrl(row.facebookUrl ?? row.facebook_url) },
    { type: "instagram", label: "Instagram", url: safeUrl(row.instagramUrl ?? row.instagram_url) },
    { type: "youtube", label: "YouTube", url: safeUrl(row.youtubeUrl ?? row.youtube_url) },
    { type: "x", label: "X", url: safeUrl(row.xUrl ?? row.x_url) },
    { type: "linkedin", label: "LinkedIn", url: safeUrl(row.linkedinUrl ?? row.linkedin_url) },
  ];
  return links.filter((l) => {
    if (!l.url) return false;
    if (l.type !== "website" && !socialUrlHasAccountPath(l.url)) return false;
    return true;
  });
}

