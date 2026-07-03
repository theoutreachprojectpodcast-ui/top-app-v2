"use client";

import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";
import OrganizationLogo from "@/components/shared/OrganizationLogo";

export default function NonprofitCardMedia({ category, tier, logoUrl, layout = "default", name = "", entityKey = "" }) {
  const tint = category?.tint || "var(--color-accent-soft)";
  const url = String(logoUrl || "").trim();
  const showLogo = layout === "trustedResource" && !!url;
  const isFeatured = tier === "featured";

  return (
    <div className={`nonprofitCardMedia${layout === "trustedResource" ? " nonprofitCardMedia--trustedResource" : ""}`}>
      {showLogo ? (
        <OrganizationLogo
          src={url}
          alt=""
          name={name || category?.label || "Organization"}
          entityKey={entityKey}
          size="md"
          surface="page"
          panel="auto"
          fallback="icon"
          fallbackIcon={
            <NonprofitIcon
              category={category}
              size={layout === "trustedResource" ? 38 : 28}
              variant={isFeatured ? "featured" : "default"}
            />
          }
        />
      ) : (
        <div
          className="nonprofitIconBadge"
          title={category?.label || "General Nonprofit"}
          style={{ "--nonprofit-icon-tint": tint }}
        >
          <NonprofitIcon
            category={category}
            size={layout === "trustedResource" ? 38 : 28}
            variant={isFeatured ? "featured" : "default"}
          />
        </div>
      )}
    </div>
  );
}
