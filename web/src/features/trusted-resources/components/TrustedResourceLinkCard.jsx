"use client";

import { ExternalLink } from "lucide-react";
import { getLinkIcon } from "@/features/trusted-resources/domain/trustedResourceOutboundLinks";

/**
 * @param {{ link: { type: string, label: string, description: string, url: string, external?: boolean } }}
 */
export default function TrustedResourceLinkCard({ link }) {
  const href = String(link?.url || "").trim();
  if (!href) return null;
  const Icon = getLinkIcon(link.type);
  const isMail = href.toLowerCase().startsWith("mailto:");
  const isTel = href.toLowerCase().startsWith("tel:");
  const external = link.external !== false && !isMail && !isTel;

  return (
    <a
      className="trustedDetailLinkCard"
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : { rel: "noopener noreferrer" })}
    >
      <span className="trustedDetailLinkCard__icon" aria-hidden="true">
        <Icon strokeWidth={2} />
      </span>
      <span className="trustedDetailLinkCard__text">
        <span className="trustedDetailLinkCard__label">{link.label}</span>
        {link.description ? <span className="trustedDetailLinkCard__desc">{link.description}</span> : null}
      </span>
      {external ? (
        <ExternalLink className="trustedDetailLinkCard__external" aria-hidden strokeWidth={2} />
      ) : null}
    </a>
  );
}
