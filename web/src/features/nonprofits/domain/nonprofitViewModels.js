/**
 * Canonical adapters for nonprofit UI: directory/trusted rows → card surface.
 * Detail routes use the same mapper with source "directory" after merge + mapDirectoryRow.
 */
export { mapNonprofitCardRow as toNonprofitCardViewModel } from "@/features/nonprofits/mappers/nonprofitCardMapper";
export { resolveFindInfoHref } from "@/features/nonprofits/domain/nonprofitCardActions";
