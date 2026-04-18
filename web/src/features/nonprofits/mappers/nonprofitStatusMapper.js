import { NONPROFIT_TIER } from "@/lib/nonprofits/verification";

export function mapNonprofitStatus(row = {}, source = "directory", tier = NONPROFIT_TIER.STANDARD) {
  const trustedFlag = !!(row?.isTrusted || row?.is_trusted || row?.raw?.is_trusted || row?.raw?.profile?.is_trusted);
  const provenAllyApproved =
    String(row?.proven_ally_status ?? row?.provenAllyStatus ?? row?.raw?.proven_ally_status ?? "").toLowerCase() === "approved" ||
    !!(row?.is_proven_ally || row?.isProvenAlly || row?.raw?.is_proven_ally);
  const isProvenAlly =
    source === "trusted" ||
    trustedFlag ||
    provenAllyApproved;

  return {
    isProvenAlly,
    label: isProvenAlly ? "Proven Ally" : "",
    variant: isProvenAlly ? "provenAlly" : "none",
  };
}

