"use client";

import { useId, useState } from "react";
import { SERVICE_OPTIONS } from "@/lib/constants";
import { resolveNteeCategoryHeaderImageUrl } from "@/features/directory/nteeCategoryHeaderImages";
import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";

export default function DirectoryCategoryQuickPick({ value, onChange, collapsible = false }) {
  const options = SERVICE_OPTIONS.filter(([k]) => k);
  const panelId = useId();
  const [panelOpen, setPanelOpen] = useState(false);

  const content = (
    <div className="directoryCategoryPick" aria-label="Filter by nonprofit category">
      <p className="directoryCategoryPickLabel">Quick category focus</p>
      <div className="directoryCategoryPickGrid">
        <button
          type="button"
          className={`directoryCategoryPickCard ${value === "" ? "isActive" : ""}`}
          onClick={() => onChange("")}
          style={{
            "--cat-tint": "rgba(158, 166, 177, 0.14)",
            "--cat-border": "var(--np-unknownGeneral)",
          }}
        >
          <span className="directoryCategoryPickCardTitle">All areas</span>
          <span className="directoryCategoryPickCardHint">No letter filter</span>
        </button>
        {options.map(([letter, label]) => {
          const cat = mapNonprofitCategory({ ntee_code: letter });
          const tint = cat.tint || "rgba(158, 166, 177, 0.12)";
          const border = `var(${cat.iconColorVar || "--np-unknownGeneral"})`;
          const headerImage = resolveNteeCategoryHeaderImageUrl(letter);
          const cardStyle = {
            "--cat-tint": tint,
            "--cat-border": border,
          };
          if (headerImage) {
            cardStyle.backgroundImage = `linear-gradient(180deg, rgba(6, 10, 18, 0.55), rgba(6, 10, 18, 0.82)), url('${headerImage.replace(/'/g, "%27")}')`;
            cardStyle.backgroundSize = "cover";
            cardStyle.backgroundPosition = "center";
            cardStyle.backgroundRepeat = "no-repeat";
          }
          return (
            <button
              key={letter}
              type="button"
              className={`directoryCategoryPickCard category-${cat.key} ${value === letter ? "isActive" : ""}${headerImage ? " directoryCategoryPickCard--hasPhoto" : ""}`}
              onClick={() => onChange(letter)}
              style={cardStyle}
            >
              <span className="directoryCategoryPickCardLetter">{letter}</span>
              <span className="directoryCategoryPickCardTitle">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!collapsible) return content;

  return (
    <div className={`directoryCategoryPickDisclosure${panelOpen ? " isOpen" : ""}`}>
      <button
        type="button"
        className="directoryCategoryPickDisclosureToggle"
        aria-expanded={panelOpen}
        aria-controls={panelId}
        onClick={() => setPanelOpen((o) => !o)}
      >
        <span>Quick Category Focus</span>
        <span className="directoryCategoryPickDisclosureChevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <div
        id={panelId}
        className="directoryCategoryPickDisclosurePanel"
        role="region"
        aria-label="Category options"
        hidden={!panelOpen}
      >
        {content}
      </div>
    </div>
  );
}
