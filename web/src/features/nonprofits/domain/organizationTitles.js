/**
 * Organization-style titles for cards, profiles, and lists.
 * Import from here so UI uses one pipeline (mapper + entityDisplayName).
 */

export { mapNonprofitCardRow as getNonprofitCardViewModel } from "@/features/nonprofits/mappers/nonprofitCardMapper";
export { mapNonprofitCardRow as getTrustedResourceCardViewModel } from "@/features/nonprofits/mappers/nonprofitCardMapper";
export {
  auditEntityTitleSlot,
  auditRegistryDisplayName,
  resolveCanonicalOrganizationName,
  resolveOrganizationCardTitle,
  resolveTrustedResourceDisplayName,
  resolveSponsorDisplayName,
  sanitizeOrganizationNameForDisplay,
  stripOrganizationTitleArtifacts,
  titleHintFromWebsiteUrl,
} from "@/lib/entityDisplayName";
