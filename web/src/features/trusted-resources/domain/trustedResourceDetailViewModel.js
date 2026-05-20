import { buildConnectLinks } from "@/features/trusted-resources/domain/trustedResourceConnectLinks";
import { buildProgramCards } from "@/features/trusted-resources/domain/trustedResourceProgramCards";
import { buildOutboundLink, partitionOutboundLinks } from "@/features/trusted-resources/domain/trustedResourceOutboundLinks";
import { getTrustedResourceDetailProfile } from "@/features/trusted-resources/domain/trustedResourceDetailProfiles";
import { buildTrustedResourceViewModel } from "@/features/trusted-resources/domain/trustedResourceViewModel";

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function parseServices(raw) {
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return text
    .split(/\r?\n|•|;/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function normalizePhone(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (text.toLowerCase().startsWith("tel:")) return text;
  const digits = text.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

/**
 * @param {ReturnType<typeof buildTrustedResourceViewModel>} card
 * @param {Record<string, unknown>} [row]
 */
export function buildTrustedResourceDetailViewModel(card, row = {}) {
  const slug = String(card.trustedResourceSlug || "").trim().toLowerCase();
  const profile = getTrustedResourceDetailProfile(slug) || {};

  const mission = firstNonEmpty(row.mission, row.mission_statement, profile.mission);
  const heroMission = firstNonEmpty(mission, card.shortDescription, card.fullDescription);
  const overview = firstNonEmpty(
    row.long_description,
    row.longDescription,
    row.full_description,
    row.fullDescription,
    card.fullDescription,
    profile.mission,
  );
  const whoTheyServe = firstNonEmpty(row.who_they_serve, row.whoTheyServe, profile.whoTheyServe);
  const services = parseServices(row.services || row.services_offered || profile.services);
  const whyItMatters = firstNonEmpty(row.why_it_matters, row.whyItMatters, profile.whyItMatters);
  const serviceArea = firstNonEmpty(
    row.service_area,
    row.serviceArea,
    profile.serviceArea,
    card.locationLabel,
  );

  const phone = normalizePhone(
    firstNonEmpty(row.contact_phone, row.contactPhone, row.phone, profile.phone),
  );
  const emailRaw = firstNonEmpty(row.contact_email, row.contactEmail, row.email, profile.email);
  const email =
    emailRaw && !/^mailto:/i.test(emailRaw) && emailRaw.includes("@")
      ? `mailto:${emailRaw.replace(/^mailto:/i, "")}`
      : emailRaw;

  const dbResourceLinks = Array.isArray(row.resource_links)
    ? row.resource_links
    : typeof row.resource_links === "string"
      ? (() => {
          try {
            return JSON.parse(row.resource_links);
          } catch {
            return [];
          }
        })()
      : [];

  const explicitLinks = [
    ...dbResourceLinks,
    ...(Array.isArray(profile.resourceLinks) ? profile.resourceLinks : []),
    { type: "donate", url: row.donation_url || row.donationUrl },
    { type: "volunteer", url: row.volunteer_url || row.volunteerUrl },
    { type: "intake", url: row.intake_url || row.intakeUrl },
    { type: "events", url: row.events_url || row.eventsUrl },
    { type: "library", url: row.resource_library_url || row.resourceLibraryUrl },
    { type: "tiktok", url: row.tiktok_url || row.tiktokUrl },
  ];

  const linkItems = Array.isArray(card.linkItems) ? card.linkItems : [];
  const outbound = [];

  if (card.websiteUrl) {
    const site = buildOutboundLink("website", card.websiteUrl);
    if (site) outbound.push(site);
  }

  for (const item of explicitLinks) {
    const type = String(item?.type || "").trim().toLowerCase();
    const url = String(item?.url || "").trim();
    if (!type || !url) continue;
    const built = buildOutboundLink(type, url, {
      label: item.label,
      description: item.description,
    });
    if (built) outbound.push(built);
  }

  for (const item of linkItems) {
    if (item.type === "website" || item.type === "email") continue;
    const type =
      item.type === "x" || item.type === "twitter"
        ? "twitter"
        : item.type === "tiktok"
          ? "tiktok"
          : item.type;
    if (!["facebook", "instagram", "linkedin", "youtube", "twitter", "tiktok"].includes(type)) continue;
    const built = buildOutboundLink(type, item.url, { label: item.label });
    if (built) outbound.push(built);
  }

  if (email) {
    const mail = buildOutboundLink("email", email.startsWith("mailto:") ? email : `mailto:${email}`);
    if (mail) outbound.push(mail);
  }
  if (phone) {
    const call = buildOutboundLink("phone", phone);
    if (call) outbound.push(call);
  }

  const partitioned = partitionOutboundLinks(outbound);
  const connectLinks = buildConnectLinks(outbound);

  const mergedResourceLinks = [
    ...dbResourceLinks,
    ...(Array.isArray(profile.resourceLinks) ? profile.resourceLinks : []),
  ];

  const programCards = buildProgramCards({
    services,
    resourceLinks: mergedResourceLinks,
    websiteUrl: card.websiteUrl,
    intakeUrl: firstNonEmpty(row.intake_url, row.intakeUrl),
    donationUrl: firstNonEmpty(row.donation_url, row.donationUrl),
    volunteerUrl: firstNonEmpty(row.volunteer_url, row.volunteerUrl),
    eventsUrl: firstNonEmpty(row.events_url, row.eventsUrl),
    libraryUrl: firstNonEmpty(row.resource_library_url, row.resourceLibraryUrl),
  });

  const detailPath = slug ? `/trusted/${slug}` : "";
  const lastReviewedAt = firstNonEmpty(row.last_reviewed_at, row.lastReviewedAt);
  const sourceNotes = firstNonEmpty(row.source_notes, row.sourceNotes);
  const detailReviewStatus = firstNonEmpty(row.detail_review_status, row.detailReviewStatus);
  const detailScrapedAt = row.detail_scraped_at || row.detailScrapedAt || null;
  const detailFieldSources =
    row.detail_field_sources && typeof row.detail_field_sources === "object"
      ? row.detail_field_sources
      : typeof row.detail_field_sources === "string"
        ? (() => {
            try {
              return JSON.parse(row.detail_field_sources);
            } catch {
              return {};
            }
          })()
        : {};

  return {
    ...card,
    detailPath,
    profilePath: detailPath || card.profilePath,
    mission,
    heroMission,
    overview,
    whoTheyServe,
    services,
    whyItMatters,
    serviceArea,
    phone,
    email,
    outboundLinks: outbound,
    connectLinks,
    programCards,
    helpfulLinks: partitioned.helpful,
    socialLinks: partitioned.social,
    contactLinks: partitioned.contact,
    lastReviewedAt,
    sourceNotes,
    detailReviewStatus,
    detailScrapedAt,
    detailFieldSources,
    isVerified: true,
  };
}
