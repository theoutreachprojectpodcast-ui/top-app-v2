"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADMIN_HORIZONTAL_NAV,
  ADMIN_MORE_NAV,
  adminBreadcrumbs,
  isAdminNavItemActive,
  matchAdminNavPath,
} from "@/lib/admin/adminNavConfig";

export default function AdminHorizontalNav() {
  const pathname = usePathname() || "";
  const navRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = ADMIN_MORE_NAV.some((item) => isAdminNavItemActive(pathname, item));
  const current = matchAdminNavPath(pathname);
  const crumbs = adminBreadcrumbs(pathname);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    function onDoc(e) {
      if (navRef.current && !navRef.current.contains(e.target)) closeMore();
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [moreOpen, closeMore]);

  return (
    <div className="adminHorizontalNav" ref={navRef}>
      <nav className="adminHorizontalNav__row" aria-label="Admin sections">
        {ADMIN_HORIZONTAL_NAV.map((item) => {
          const active = isAdminNavItemActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`adminHorizontalNav__link${active ? " isActive" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
              {item.readiness === "partial" ? <span className="adminNavBadge adminNavBadge--partial">Beta</span> : null}
            </Link>
          );
        })}
        <div className="adminHorizontalNav__more">
          <button
            type="button"
            className={`adminHorizontalNav__link adminHorizontalNav__moreBtn${moreActive ? " isActive" : ""}`}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
          </button>
          {moreOpen ? (
            <div className="adminHorizontalNav__moreMenu" role="menu">
              {ADMIN_MORE_NAV.map((item) => {
                const active = isAdminNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    className={active ? "isActive" : ""}
                    onClick={closeMore}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </nav>

      <div className="adminHorizontalNav__meta">
        <nav className="adminHorizontalNav__breadcrumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.href + i}>
              {i > 0 ? <span className="adminMuted"> / </span> : null}
              {i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
        {current?.description ? (
          <p className="adminHorizontalNav__sectionDesc adminMuted">{current.description}</p>
        ) : null}
      </div>
    </div>
  );
}
