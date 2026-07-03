"use client";

import Link from "next/link";
import SiteMobileNavMoreMenu from "@/components/navigation/SiteMobileNavMoreMenu";
import { SITE_HAMBURGER_NAV_ITEMS } from "@/components/navigation/siteBottomNavConfig";

/**
 * Renders hamburger overflow links. Use `onItemClick` in TopApp (in-tab nav on `/`);
 * default is plain Next.js links for AppShell sub-routes.
 *
 * @param {{ onItemClick?: (item: { key: string, href: string, label: string }) => void }} props
 */
export default function SiteMobileNavHamburgerEntries({ onItemClick }) {
  return SITE_HAMBURGER_NAV_ITEMS.map((item) => {
    if (typeof onItemClick === "function") {
      return (
        <button
          key={item.key}
          type="button"
          className="siteMobileNavMore__entry"
          title={item.linkTitle || item.label}
          onClick={() => onItemClick(item)}
        >
          {item.label}
        </button>
      );
    }
    return (
      <Link
        key={item.key}
        className="siteMobileNavMore__entry"
        href={item.href}
        title={item.linkTitle || item.label}
      >
        {item.label}
      </Link>
    );
  });
}

/**
 * Header hamburger with full site map entries.
 *
 * @param {{
 *   tone?: "app" | "podcast",
 *   align?: "start" | "end",
 *   shellClass?: string,
 *   onItemClick?: (item: { key: string, href: string, label: string }) => void,
 * }} props
 */
export function SiteHamburgerNavMenu({ tone = "app", align = "start", shellClass = "", onItemClick }) {
  return (
    <SiteMobileNavMoreMenu tone={tone} align={align} shellClass={shellClass}>
      <SiteMobileNavHamburgerEntries onItemClick={onItemClick} />
    </SiteMobileNavMoreMenu>
  );
}
