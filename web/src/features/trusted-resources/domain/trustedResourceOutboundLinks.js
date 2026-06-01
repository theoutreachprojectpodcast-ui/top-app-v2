import {
  Calendar,
  CircleDollarSign,
  Music2,
  Facebook,
  Globe,
  HandHeart,
  HeartHandshake,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Twitter,
  Youtube,
  ClipboardList,
  Library,
} from "lucide-react";

/** @typedef {"website"|"intake"|"donate"|"volunteer"|"events"|"library"|"facebook"|"instagram"|"linkedin"|"youtube"|"twitter"|"tiktok"|"email"|"phone"|"contact"} TrustedLinkType */

/**
 * @typedef {object} TrustedOutboundLink
 * @property {TrustedLinkType} type
 * @property {string} label
 * @property {string} description
 * @property {string} url
 * @property {boolean} [external]
 */

const LINK_META = {
  website: {
    label: "Visit Website",
    description: "Official organization site for programs, news, and contact.",
    Icon: Globe,
  },
  intake: {
    label: "Get Help / Apply",
    description: "Request support, apply for programs, or start intake.",
    Icon: ClipboardList,
  },
  donate: {
    label: "Donate",
    description: "Support their mission with a tax-deductible gift where offered.",
    Icon: CircleDollarSign,
  },
  volunteer: {
    label: "Volunteer",
    description: "Offer your time for events, mentorship, or operations.",
    Icon: HandHeart,
  },
  events: {
    label: "Events",
    description: "See upcoming gatherings, fundraisers, or community events.",
    Icon: Calendar,
  },
  library: {
    label: "Resource Library",
    description: "Guides, downloads, and reference materials.",
    Icon: Library,
  },
  facebook: { label: "Facebook", description: "Follow updates and community posts.", Icon: Facebook },
  instagram: { label: "Instagram", description: "Photos, stories, and event highlights.", Icon: Instagram },
  linkedin: { label: "LinkedIn", description: "News, jobs, and organizational updates.", Icon: Linkedin },
  youtube: { label: "YouTube", description: "Videos, interviews, and program stories.", Icon: Youtube },
  twitter: { label: "X (Twitter)", description: "Quick updates and announcements.", Icon: Twitter },
  tiktok: { label: "TikTok", description: "Short-form community content.", Icon: Music2 },
  email: { label: "Email", description: "Reach the team directly by email.", Icon: Mail },
  phone: { label: "Phone", description: "Call for questions or support.", Icon: Phone },
  contact: { label: "Contact", description: "General contact or inquiry page.", Icon: Mail },
};

const HELPFUL_ORDER = ["website", "intake", "donate", "volunteer", "events", "library", "contact"];
const SOCIAL_ORDER = ["facebook", "instagram", "linkedin", "youtube", "twitter", "tiktok"];
const CONTACT_ORDER = ["email", "phone"];

/**
 * @param {TrustedLinkType} type
 * @param {string} url
 * @param {{ label?: string, description?: string }} [overrides]
 * @returns {TrustedOutboundLink | null}
 */
export function buildOutboundLink(type, url, overrides = {}) {
  const href = String(url || "").trim();
  if (!href) return null;
  const meta = LINK_META[type];
  if (!meta) return null;
  const external = !href.toLowerCase().startsWith("mailto:") && !href.toLowerCase().startsWith("tel:");
  return {
    type,
    label: overrides.label || meta.label,
    description: overrides.description || meta.description,
    url: href,
    external,
  };
}

/**
 * @param {TrustedOutboundLink[]} links
 * @returns {{ helpful: TrustedOutboundLink[], social: TrustedOutboundLink[], contact: TrustedOutboundLink[] }}
 */
export function partitionOutboundLinks(links) {
  const helpful = [];
  const social = [];
  const contact = [];
  const seen = new Set();

  for (const link of links) {
    if (!link?.url || seen.has(link.url)) continue;
    seen.add(link.url);
    if (SOCIAL_ORDER.includes(link.type)) social.push(link);
    else if (CONTACT_ORDER.includes(link.type)) contact.push(link);
    else helpful.push(link);
  }

  const sortBy = (order) => (a, b) => order.indexOf(a.type) - order.indexOf(b.type);
  helpful.sort(sortBy(HELPFUL_ORDER));
  social.sort(sortBy(SOCIAL_ORDER));
  contact.sort(sortBy(CONTACT_ORDER));

  return { helpful, social, contact };
}

/**
 * @param {TrustedOutboundLink[]} links
 * @param {TrustedLinkType} type
 */
export function getLinkIcon(type) {
  return LINK_META[type]?.Icon || Globe;
}
