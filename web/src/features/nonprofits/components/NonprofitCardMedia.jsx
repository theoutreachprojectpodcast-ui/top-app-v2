import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";

export default function NonprofitCardMedia({ category, tier, logoUrl, layout = "default" }) {
  const tint = category?.tint || "var(--color-accent-soft)";
  const url = String(logoUrl || "").trim();
  const showLogo = layout === "proven" && !!url;
  const isFeatured = tier === "featured";

  return (
    <div className={`nonprofitCardMedia${layout === "proven" ? " nonprofitCardMedia--proven" : ""}`}>
      <div
        className={`nonprofitIconBadge${showLogo ? " nonprofitIconBadge--logo" : ""}`}
        title={category?.label || "General Nonprofit"}
        style={{ "--nonprofit-icon-tint": tint }}
      >
        {showLogo ? (
          <img className="nonprofitLogoImg" src={url} alt="" loading="lazy" decoding="async" />
        ) : (
          <NonprofitIcon category={category} size={30} variant={isFeatured ? "featured" : "default"} />
        )}
      </div>
    </div>
  );
}

