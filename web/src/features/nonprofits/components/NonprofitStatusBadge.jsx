export default function NonprofitStatusBadge({ status }) {
  if (!status?.isProvenAlly) return null;
  return <span className="nonprofitBadge badgeProvenAlly">{status.label || "Proven Ally"}</span>;
}

