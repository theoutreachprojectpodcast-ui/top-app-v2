"use client";

import { nteeMajorCategoryLabel, resolveNteeCategoryHeaderImageUrl } from "@/features/directory/nteeCategoryHeaderImages";

export default function DirectoryCategoryHeader({ letter }) {
  const code = String(letter || "").trim().toUpperCase();
  if (!code) return null;

  const label = nteeMajorCategoryLabel(code);
  const imageUrl = resolveNteeCategoryHeaderImageUrl(code);
  if (!label || !imageUrl) return null;

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
