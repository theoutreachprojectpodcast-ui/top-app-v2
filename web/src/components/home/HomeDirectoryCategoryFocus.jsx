"use client";

import { useId, useState } from "react";
import DirectoryCategoryQuickPick from "@/features/directory/components/DirectoryCategoryQuickPick";
import HomeDirectoryQuickCategories from "@/components/home/HomeDirectoryQuickCategories";

/**
 * Home directory categories — desktop: collapsible full grid; mobile: top 3 chips + optional full list.
 */
export default function HomeDirectoryCategoryFocus({ activeLetter, activeAudience, onSelect }) {
  const allPanelId = useId();
  const [showAllCategories, setShowAllCategories] = useState(false);

  function onFullCategoryLetter(letter) {
    onSelect({
      letter: letter || "",
      audience: letter ? activeAudience : "all",
    });
    setShowAllCategories(false);
  }

  return (
    <>
      <div className="homeDirectoryCategoryFocus homeDirectoryCategoryFocus--full">
        <DirectoryCategoryQuickPick
          value={activeLetter}
          onChange={onFullCategoryLetter}
          collapsible
          visualStyle="color"
        />
      </div>

      <div className="homeDirectoryCategoryFocus homeDirectoryCategoryFocus--compact">
        <HomeDirectoryQuickCategories
          activeLetter={activeLetter}
          activeAudience={activeAudience}
          onSelect={onSelect}
        />

        <button
          type="button"
          className="homeDirectoryCategoryFocus__expandBtn"
          aria-expanded={showAllCategories}
          aria-controls={allPanelId}
          onClick={() => setShowAllCategories((open) => !open)}
        >
          <span>{showAllCategories ? "Fewer categories" : "All categories"}</span>
          <span className="homeDirectoryCategoryFocus__expandChevron" aria-hidden="true">
            ▾
          </span>
        </button>

        {showAllCategories ? (
          <div
            id={allPanelId}
            className="homeDirectoryCategoryFocus__allPanel"
            role="region"
            aria-label="All nonprofit categories"
          >
            <DirectoryCategoryQuickPick
              value={activeLetter}
              onChange={onFullCategoryLetter}
              collapsible={false}
              visualStyle="color"
              hideLabel
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
