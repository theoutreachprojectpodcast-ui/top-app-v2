"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS, isAdminSectionActive } from "@/lib/admin/adminNavConfig";

/**
 * Compact top-level section tabs (Overview / Content / Users / Commerce / Operations).
 */
export default function AdminSectionTabs() {
  const pathname = usePathname() || "";

  return (
    <nav className="adminSectionTabs" aria-label="Admin areas">
      {ADMIN_SECTIONS.map((section) => {
        const active = isAdminSectionActive(pathname, section);
        return (
          <Link
            key={section.id}
            href={section.href}
            className={`adminSectionTabs__tab${active ? " isActive" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
