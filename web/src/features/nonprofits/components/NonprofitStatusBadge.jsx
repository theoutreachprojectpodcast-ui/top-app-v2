export default function NonprofitStatusBadge({ status }) {
  if (!(status?.isTrustedResource ?? status?.isProvenAlly)) return null;
  return <span className="nonprofitBadge badgeTrustedResource">{status.label || "Trusted Resource"}</span>;
}

