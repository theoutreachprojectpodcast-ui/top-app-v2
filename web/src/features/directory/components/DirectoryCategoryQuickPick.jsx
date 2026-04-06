"use client";

import { SERVICE_OPTIONS } from "@/lib/constants";
import { mapNonprofitCategory } from "@/features/nonprofits/mappers/categoryMapper";

export default function DirectoryCategoryQuickPick({ value, onChange }) {
  const options = SERVICE_OPTIONS.filter(([k]) => k);

  return (
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
          return (
            <button
              key={letter}
              type="button"
              className={`directoryCategoryPickCard category-${cat.key} ${value === letter ? "isActive" : ""}`}
              onClick={() => onChange(letter)}
              style={{
                "--cat-tint": tint,
                "--cat-border": border,
              }}
            >
              <span className="directoryCategoryPickCardLetter">{letter}</span>
              <span className="directoryCategoryPickCardTitle">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
