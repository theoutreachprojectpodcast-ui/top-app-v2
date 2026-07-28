import {
  Calendar,
  CircleDollarSign,
  ClipboardList,
  Globe,
  HandHeart,
  HeartHandshake,
  Home,
  Briefcase,
  Users,
  Shield,
  HeartPulse,
  BookOpen,
} from "lucide-react";

/**
 * @typedef {object} TrustedProgramCard
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} url
 * @property {string} ctaLabel
 * @property {string} iconType
 */

/** Keep icons off the card object so detail view models stay RSC-serializable. */
const CARD_TYPE_ICONS = {
  programs: BookOpen,
  services: HeartHandshake,
  intake: ClipboardList,
  donate: CircleDollarSign,
  volunteer: HandHeart,
  events: Calendar,
  library: BookOpen,
  contact: Globe,
  veterans: Shield,
  family: Users,
  mental_health: HeartPulse,
  career: Briefcase,
  housing: Home,
  emergency: ClipboardList,
};

const CARD_TYPE_META = {
  programs: {
    title: "Programs",
    description: "Explore structured programs and how to participate.",
    ctaLabel: "View programs",
  },
  services: {
    title: "Services",
    description: "See the services this organization provides.",
    ctaLabel: "Learn more",
  },
  intake: {
    title: "Get help",
    description: "Apply for support or start the intake process.",
    ctaLabel: "Get help",
  },
  donate: {
    title: "Donate",
    description: "Support their mission with a contribution.",
    ctaLabel: "Donate",
  },
  volunteer: {
    title: "Volunteer",
    description: "Offer your time and skills.",
    ctaLabel: "Volunteer",
  },
  events: {
    title: "Events",
    description: "Find upcoming gatherings and activities.",
    ctaLabel: "See events",
  },
  library: {
    title: "Resources",
    description: "Guides, downloads, and reference materials.",
    ctaLabel: "Browse resources",
  },
  contact: {
    title: "Contact",
    description: "Reach the team with questions.",
    ctaLabel: "Contact",
  },
  veterans: {
    title: "Veterans resources",
    description: "Programs and support for veterans.",
    ctaLabel: "Explore",
  },
  family: {
    title: "Family support",
    description: "Resources for military and first-responder families.",
    ctaLabel: "Learn more",
  },
  mental_health: {
    title: "Mental health support",
    description: "Counseling, peer support, and wellness resources.",
    ctaLabel: "Get support",
  },
  career: {
    title: "Career support",
    description: "Employment, training, and transition assistance.",
    ctaLabel: "Explore",
  },
  housing: {
    title: "Housing support",
    description: "Shelter, housing navigation, and stability programs.",
    ctaLabel: "Learn more",
  },
  emergency: {
    title: "Emergency assistance",
    description: "Urgent help and crisis-oriented resources.",
    ctaLabel: "Get help now",
  },
};

/**
 * @param {{ type?: string, label?: string, description?: string, url?: string }} item
 * @param {string} [fallbackUrl]
 * @returns {TrustedProgramCard | null}
 */
function linkToCard(item, fallbackUrl = "") {
  const type = String(item?.type || "services").trim().toLowerCase();
  const url = String(item?.url || fallbackUrl || "").trim();
  if (!url) return null;
  const meta = CARD_TYPE_META[type] || CARD_TYPE_META.services;
  const title = String(item?.label || meta.title).trim();
  const description = String(item?.description || meta.description).trim();
  return {
    id: `${type}-${url}`,
    title,
    description,
    url,
    ctaLabel: meta.ctaLabel,
    iconType: CARD_TYPE_META[type] ? type : "services",
  };
}

/**
 * @param {string} [iconType]
 * @returns {import("lucide-react").LucideIcon}
 */
export function getProgramCardIcon(iconType) {
  return CARD_TYPE_ICONS[iconType] || CARD_TYPE_ICONS.services;
}

/**
 * @param {{
 *   services?: string[],
 *   resourceLinks?: { type?: string, label?: string, description?: string, url?: string }[],
 *   websiteUrl?: string,
 *   intakeUrl?: string,
 * }} input
 * @returns {TrustedProgramCard[]}
 */
export function buildProgramCards(input = {}) {
  const websiteUrl = String(input.websiteUrl || "").trim();
  const intakeUrl = String(input.intakeUrl || "").trim();
  const cards = [];
  const seen = new Set();

  const push = (card) => {
    if (!card?.url || seen.has(card.url)) return;
    seen.add(card.url);
    cards.push(card);
  };

  for (const item of input.resourceLinks || []) {
    push(linkToCard(item));
  }

  const autoByUrl = [
    ["intake", input.intakeUrl],
    ["donate", input.donationUrl],
    ["volunteer", input.volunteerUrl],
    ["events", input.eventsUrl],
    ["library", input.libraryUrl],
    ["contact", input.contactUrl],
  ];
  for (const [type, url] of autoByUrl) {
    const u = String(url || "").trim();
    if (!u) continue;
    push(linkToCard({ type, url: u }));
  }

  const services = Array.isArray(input.services) ? input.services : [];
  if (services.length && (intakeUrl || websiteUrl)) {
    const target = intakeUrl || websiteUrl;
    if (!seen.has(target)) {
      push({
        id: `programs-${target}`,
        title: "Programs & services",
        description: services.slice(0, 3).join(" · "),
        url: target,
        ctaLabel: intakeUrl ? "View programs" : "Visit website",
        iconType: "programs",
      });
    }
  }

  return cards;
}
