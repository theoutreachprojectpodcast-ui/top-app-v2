"use client";

import { useEffect, useMemo, useState } from "react";
import SavedOrganizationCard from "@/features/profile/components/SavedOrganizationCard";

export default function SavedOrganizationsList({
  organizations = [],
  savedEinCount = 0,
  onToggleFavorite,
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const count = Math.max(savedEinCount, organizations.length);

  const orderedOrgs = useMemo(() => organizations, [organizations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "saved-organizations") setExpanded(true);
  }, []);

  const showBody = expanded;

  return (
    <section
      className={`card savedOrganizationsPanel${expanded ? "" : " savedOrganizationsPanel--collapsed"}`}
      id="saved-organizations"
      aria-labelledby="saved-organizations-title"
    >
      <div className="savedOrganizationsPanel__headRow">
        <div className="savedOrganizationsPanel__head">
          <h3 className="savedOrganizationsPanel__title" id="saved-organizations-title">
            Saved organizations
          </h3>
          {count > 0 ? (
            <p className="sponsorSectionLead savedOrganizationsPanel__lead">
              {count} saved {count === 1 ? "organization" : "organizations"}. Expand a row for details.
            </p>
          ) : null}
        </div>
        {count > 0 ? (
          <button
            type="button"
            className="btnSoft savedOrganizationsPanel__toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="saved-organizations-list"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>

      {showBody ? (
        !orderedOrgs.length ? (
          <p className="sponsorSectionLead">
            No saved organizations yet. Star an organization from Directory or Trusted Resources.
          </p>
        ) : (
          <div className="savedOrganizationsPanel__list" id="saved-organizations-list">
            {orderedOrgs.map((card) => (
              <SavedOrganizationCard
                key={`saved-${String(card?.einNormalized || card?.ein || "")}`}
                card={card}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
