"use client";

import { Activity, Mountain, Shield } from "lucide-react";

const CATEGORIES = [
  {
    id: "health",
    label: "Health & Wellness",
    shortLabel: "Health",
    letter: "E",
    audience: "",
    Icon: Activity,
  },
  {
    id: "outdoor",
    label: "Outdoor & Recreation",
    shortLabel: "Outdoor",
    letter: "N",
    audience: "",
    Icon: Mountain,
  },
  {
    id: "veteran",
    label: "Veteran & First Responder Support",
    shortLabel: "Veterans",
    letter: "",
    audience: "veteran",
    Icon: Shield,
  },
];

export default function HomeDirectoryQuickCategories({
  activeLetter,
  activeAudience,
  onSelect,
  hideLabel = false,
}) {
  return (
    <div className="homeDirectoryQuick" aria-label="Top nonprofit categories">
      {hideLabel ? null : <p className="homeDirectoryQuick__label">Top categories</p>}
      <div className="homeDirectoryQuick__grid">
        {CATEGORIES.map((cat) => {
          const isActive =
            (cat.letter && activeLetter === cat.letter) ||
            (cat.audience && activeAudience === cat.audience);
          const { Icon } = cat;
          return (
            <button
              key={cat.id}
              type="button"
              className={`homeDirectoryQuick__card homeDirectoryQuick__card--${cat.id}${isActive ? " isActive" : ""}`}
              onClick={() => onSelect({ letter: cat.letter, audience: cat.audience })}
            >
              <span className="homeDirectoryQuick__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="homeDirectoryQuick__name homeDirectoryQuick__name--full">{cat.label}</span>
              <span className="homeDirectoryQuick__name homeDirectoryQuick__name--short">{cat.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
