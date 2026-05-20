"use client";

import { createElement } from "react";
import { ExternalLink } from "lucide-react";

/**
 * @param {{ card: { title: string, description: string, url: string, ctaLabel: string, Icon: import("lucide-react").LucideIcon } }}
 */
export default function TrustedResourceProgramCard({ card }) {
  const href = String(card?.url || "").trim();
  if (!href) return null;
  return (
    <a
      className="trustedDetailProgramCard"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="trustedDetailProgramCard__icon" aria-hidden="true">
        {card.Icon ? createElement(card.Icon, { strokeWidth: 2 }) : null}
      </span>
      <span className="trustedDetailProgramCard__body">
        <span className="trustedDetailProgramCard__title">{card.title}</span>
        {card.description ? (
          <span className="trustedDetailProgramCard__desc">{card.description}</span>
        ) : null}
        <span className="trustedDetailProgramCard__cta">
          {card.ctaLabel || "Learn more"}
          <ExternalLink className="trustedDetailProgramCard__ctaIcon" aria-hidden strokeWidth={2} />
        </span>
      </span>
    </a>
  );
}
