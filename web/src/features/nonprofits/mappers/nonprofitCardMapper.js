import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";
import { getNonprofitVerificationTier } from "@/lib/nonprofits/verification";
import { rowCity, rowEin, rowName, rowNtee, rowState } from "@/lib/utils";
import { nteeToService } from "@/lib/utils";
import { mapNonprofitLinks } from "@/features/nonprofits/mappers/nonprofitLinksMapper";

export function mapNonprofitCardRow(row = {}, source = "directory") {
  const category = mapNonprofitCategory(row);
  const tier = getNonprofitVerificationTier(row, source);
  const city = rowCity(row);
  const state = rowState(row);
  const nteeCode = rowNtee(row);
  return {
    id: row.id || rowEin(row) || rowName(row),
    ein: rowEin(row),
    name: rowName(row),
    city,
    state,
    location: [city, state].filter(Boolean).join(", ") || "Location not listed",
    category,
    tier,
    description: nteeToService(nteeCode),
    links: mapNonprofitLinks(row),
    raw: row,
  };
}

