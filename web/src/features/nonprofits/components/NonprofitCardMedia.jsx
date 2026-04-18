import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";

export default function NonprofitCardMedia({ category, tier }) {
  const tint = category?.tint || "rgba(228, 188, 92, 0.12)";
  return (
    <div className="nonprofitCardMedia">
      <div className="nonprofitIconBadge" title={category?.label || "General Nonprofit"} style={{ "--nonprofit-icon-tint": tint }}>
        <NonprofitIcon category={category} size={30} variant={tier === "featured" ? "featured" : "default"} />
      </div>
    </div>
  );
}
