"use client";

import { nteeMajorCategoryLabel, resolveNteeCategoryHeaderImageUrl } from "@/features/directory/nteeCategoryHeaderImages";
import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";
import NonprofitIcon from "@/features/nonprofits/components/NonprofitIcon";

export default function DirectoryCategoryHeader({ letter, variant = "hero" }) {
  const code = String(letter || "").trim().toUpperCase();
  if (!code) return null;

  const label = nteeMajorCategoryLabel(code);
  if (!label) return null;

  if (variant === "compact") {
    const cat = mapNonprofitCategory({ ntee_code: code });
    return (
      <div
        className="directoryCategoryHeader directoryCategoryHeader--compact"
        role="region"
        aria-label={`${label} category`}
        style={{
          "--cat-tint": cat.tint || "rgba(158, 166, 177, 0.12)",
          "--cat-border": `var(${cat.iconColorVar || "--np-unknownGeneral"})`,
        }}
      >
        <span className="directoryCategoryHeader__iconWrap" aria-hidden="true">
          <NonprofitIcon category={cat} size={22} />
        </span>
        <div className="directoryCategoryHeader__content">
          <span className="directoryCategoryHeader__eyebrow">Service area</span>
          <h4 className="directoryCategoryHeader__title">{label}</h4>
        </div>
      </div>
    );
  }

  const imageUrl = resolveNteeCategoryHeaderImageUrl(code);
  if (!imageUrl) return null;

  const safeUrl = imageUrl.replace(/'/g, "%27");

  return (
    <div className="directoryCategoryHeader" role="region" aria-label={`${label} category`}>
      <div
        className="directoryCategoryHeader__image"
        style={{ backgroundImage: `url('${safeUrl}')` }}
        aria-hidden="true"
      />
      <div className="directoryCategoryHeader__scrim" aria-hidden="true" />
      <div className="directoryCategoryHeader__content">
        <span className="directoryCategoryHeader__eyebrow">Service area</span>
        <h4 className="directoryCategoryHeader__title">{label}</h4>
      </div>
    </div>
  );
}
