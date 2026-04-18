export default function NonprofitStatusBadge({ status }) {
  if (!status?.isTrustedResource) return null;
  return <span className="nonprofitBadge badgeTrustedResource">{status.label || "Trusted Resource"}</span>;
}

