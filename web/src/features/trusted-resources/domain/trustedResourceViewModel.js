import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";
import { mapNonprofitLinks } from "@/features/nonprofits/mappers/nonprofitLinksMapper";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { mergeTrustedResourcesPresentation } from "@/features/trusted-resources/trustedResourcesPresentation";
import { dedupeTrustedResourceLogoAgainstHeader } from "@/features/trusted-resources/domain/trustedResourceModel";
import { resolveTrustedResourceListingHeroImageUrl } from "@/lib/nonprofits/resolveOrgListingHeaderImageUrl";
import { sanitizeDisplayableImageUrl } from "@/lib/media/safeImageUrl";
import { resolveCanonicalOrganizationName } from "@/lib/entityDisplayName";

const TRUSTED_LISTING_HERO_FALLBACK = "/home/home-main-topographic-complementary.svg";

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function truncateLine(value, max = 260) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/**
 * Curated Trusted Resource card + detail shape. Built from API/join rows; registry + catalog fields override directory.
 *
 * @param {Record<string, unknown>} row — output of `fetchTrustedResources` (directory join applied, not yet merged)
 * @returns {{
 *   id: string,
 *   directoryNonprofitId: string,
 *   sourceOrganizationId: string,
 *   trustedResourceSlug: string,
 *   name: string,
 *   logoImage: string,
 *   headerImage: string,
 *   backgroundImage: string,
 *   headerIsFallback: boolean,
 *   trustedResourceCategory: { key: string, label: string, tint?: string, iconType?: string, iconColorVar?: string },
 *   category: { key: string, label: string, tint?: string, iconType?: string, iconColorVar?: string },
 *   shortDescription: string,
 *   fullDescription: string,
 *   websiteUrl: string,
 *   linkItems: { type: string, url: string, label: string }[],
 *   socialLinks: Record<string, string>,
 *   locationLabel: string,
 *   sortOrder: number,
 *   profilePath: string,
 *   einIdentityVerified: boolean,
 * }}
 */
export function buildTrustedResourceViewModel(row = {}) {
  const merged = mergeTrustedResourcesPresentation({ ...row });
  const profile = merged.raw?.profile || {};
  const org = merged.raw?.org || {};

  const einRaw = firstNonEmpty(merged.ein, profile.ein, org.ein);
  const einNorm = normalizeEinDigits(einRaw);
  const einIdentityVerified = einNorm.length === 9;

  const titleCandidates = [
    merged.orgName,
    merged.display_name,
    merged.catalog_display_name,
    profile.display_name_override,
    profile.organization_name,
    org.org_name,
    org.name,
  ].filter(Boolean);

  const name = resolveCanonicalOrganizationName({
    trustCanonical: !!merged.canonicalDisplayName,
    canonicalDisplayName: merged.canonicalDisplayName,
    candidateNames: titleCandidates,
    trustedResourceSlug: merged.trustedResourceSlug,
    websiteUrl: firstNonEmpty(merged.website, profile.website, org.website),
    emptyFallback: "Trusted resource",
  });

  const logoFromTrusted = sanitizeDisplayableImageUrl(String(merged.logoUrl || merged.logo_url || "").trim());
  const logoFromProfile = sanitizeDisplayableImageUrl(String(profile.logo_url || "").trim());
  const logoFromOrg = sanitizeDisplayableImageUrl(String(org.logo_url || "").trim());

  const curatedHero = sanitizeDisplayableImageUrl(
    String(resolveTrustedResourceListingHeroImageUrl(merged) || "").trim(),
  );
  const headerIsFallback = !curatedHero;
  const headerImage = curatedHero || sanitizeDisplayableImageUrl(TRUSTED_LISTING_HERO_FALLBACK);

  const logoImage = dedupeTrustedResourceLogoAgainstHeader(
    logoFromTrusted || logoFromProfile || logoFromOrg,
    curatedHero,
    { profile: logoFromProfile, org: logoFromOrg },
  );

  const trustedFull = firstNonEmpty(
    merged.full_description,
    merged.fullDescription,
    profile.full_description,
    org.full_description,
  );

  const curatedShort = firstNonEmpty(
    merged.description,
    merged.short_description,
    profile.description,
    org.description,
  );
  const directoryLong = firstNonEmpty(
    profile.description,
    profile.services_offered,
    profile.who_you_serve,
    org.description,
  );
  const shortDescription = truncateLine(curatedShort || directoryLong, 280);
  const fullDescription = truncateLine(firstNonEmpty(trustedFull, directoryLong, curatedShort), 2000);

  const trustedResourceCategory = mapNonprofitCategory(merged);
  const category = trustedResourceCategory;

  const websiteUrl = firstNonEmpty(merged.website, profile.website, org.website);

  const emailRaw = firstNonEmpty(
    merged.contact_email,
    merged.contactEmail,
    profile.contact_email,
    profile.email,
    org.email,
  ).trim();
  const email =
    emailRaw && /^mailto:/i.test(emailRaw)
      ? emailRaw
      : emailRaw && emailRaw.includes("@")
        ? `mailto:${emailRaw.replace(/^mailto:/i, "")}`
        : "";

  const linkItems = mapNonprofitLinks(merged, { trustMode: "curated" });
  if (email) {
    const mailUrl = email.startsWith("mailto:") ? email : `mailto:${email}`;
    linkItems.push({ type: "email", label: "Email", url: mailUrl });
  }

  const locationLabel = firstNonEmpty(
    merged.trustedResourceDisplayLocation,
    [merged.city, merged.state].filter(Boolean).join(", "),
    profile.location,
  );

  const sortOrder = Number(merged.sort_order ?? merged.sortOrder ?? 0) || 0;
  const slug = String(merged.trustedResourceSlug || "").trim();
  const catalogId = String(merged.catalogId ?? merged.id ?? "").trim();
  const id = slug || catalogId || (einNorm.length === 9 ? einNorm : name);

  const detailPath = slug ? `/trusted/${slug}` : "";
  const profilePath = detailPath || (einIdentityVerified ? `/nonprofit/${einNorm}` : "");

  const sourceOrganizationId = firstNonEmpty(
    merged.source_organization_id,
    merged.sourceOrganizationId,
    org.id,
    org.organization_id,
  );

  /** Icon row uses the same URLs as `linkItems`; keyed for consumers/tests. */
  const socialLinks = {};
  for (const it of linkItems) {
    if (it.type === "website") continue;
    socialLinks[it.type] = it.url;
  }

  return {
    id,
    directoryNonprofitId: einNorm,
    sourceOrganizationId,
    trustedResourceSlug: slug,
    name,
    logoImage,
    headerImage,
    backgroundImage: headerImage,
    headerIsFallback,
    trustedResourceCategory,
    category,
    shortDescription,
    fullDescription,
    websiteUrl,
    linkItems,
    socialLinks,
    locationLabel: locationLabel || "United States",
    sortOrder,
    detailPath,
    profilePath,
    einIdentityVerified,
  };
}
