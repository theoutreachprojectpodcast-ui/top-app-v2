import { buildOutboundLink } from "@/features/trusted-resources/domain/trustedResourceOutboundLinks";

/** Display order for unified “Connect with this organization” grid. */
const CONNECT_ORDER = [
  "website",
  "intake",
  "donate",
  "volunteer",
  "events",
  "library",
  "contact",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "twitter",
  "tiktok",
  "email",
  "phone",
];

/**
 * @param {import("@/features/trusted-resources/domain/trustedResourceOutboundLinks").TrustedOutboundLink[]} links
 */
export function buildConnectLinks(links) {
  const seen = new Set();
  const merged = [];
  for (const link of links || []) {
    if (!link?.url || seen.has(link.url)) continue;
    seen.add(link.url);
    merged.push(link);
  }
  merged.sort((a, b) => {
    const ai = CONNECT_ORDER.indexOf(a.type);
    const bi = CONNECT_ORDER.indexOf(b.type);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  return merged;
}

/**
 * @param {import("@/features/trusted-resources/domain/trustedResourceOutboundLinks").TrustedOutboundLink[]} outbound
 */
export function partitionForSidebar(outbound) {
  const social = [];
  const contact = [];
  const quick = [];
  const socialTypes = new Set(["facebook", "instagram", "linkedin", "youtube", "twitter", "tiktok"]);
  const contactTypes = new Set(["email", "phone"]);
  const quickTypes = new Set(["website", "donate", "volunteer", "intake"]);

  for (const link of outbound || []) {
    if (!link?.url) continue;
    if (socialTypes.has(link.type)) social.push(link);
    else if (contactTypes.has(link.type)) contact.push(link);
    else if (quickTypes.has(link.type)) quick.push(link);
  }
  return { social, contact, quick };
}

export { buildOutboundLink };
