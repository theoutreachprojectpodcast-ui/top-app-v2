"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  findAdminSectionForPath,
  isAdminNavItemActive,
  matchAdminNavPath,
} from "@/lib/admin/adminNavConfig";

/**
 * Left subnav for the active top-level section.
 * @param {{ onNavigate?: () => void, className?: string }} props
 */
export default function AdminSectionSidebar({ onNavigate, className = "" }) {
  const pathname = usePathname() || "";
  const section = findAdminSectionForPath(pathname);
  const current = matchAdminNavPath(pathname);

  if (!section?.items?.length) return null;

  return (
    <aside className={`adminSectionSidebar ${className}`.trim()} aria-label={`${section.label} pages`}>
      <p className="adminSectionSidebar__label">{section.label}</p>
      <nav className="adminSectionSidebar__nav">
        {section.items.map((item) => {
          const active = isAdminNavItemActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`adminSectionSidebar__link${active ? " isActive" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate?.()}
              title={item.description || item.label}
            >
              <span className="adminSectionSidebar__linkLabel">{item.label}</span>
              {item.readiness === "partial" ? (
                <span className="adminNavBadge adminNavBadge--partial">Beta</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {current?.description ? (
        <p className="adminSectionSidebar__hint adminMuted">{current.description}</p>
      ) : null}
    </aside>
  );
}
