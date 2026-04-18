import { NONPROFIT_TIER } from "@/lib/nonprofits/verification";

export function mapNonprofitStatus(row = {}, source = "directory", tier = NONPROFIT_TIER.STANDARD) {
  const trustedFlag = !!(row?.isTrusted || row?.is_trusted || row?.raw?.is_trusted || row?.raw?.profile?.is_trusted);
  const trustedListingApproved =
    String(
      row?.trusted_resource_status ??
        row?.trustedResourceStatus ??
        row?.raw?.trusted_resource_status ??
        row?.raw?.profile?.trusted_resource_status ??
        ""
    ).toLowerCase() === "approved" ||
    !!(row?.is_trusted_resource || row?.raw?.is_trusted_resource || row?.raw?.profile?.is_trusted_resource);
  const isTrustedResource =
    source === "trusted" || trustedFlag || trustedListingApproved;

  return {
    isTrustedResource,
    label: isTrustedResource ? "Trusted Resource" : "",
    variant: isTrustedResource ? "trustedResource" : "none",
  };
}

