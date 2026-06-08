"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_SECTIONS,
  adminBreadcrumbs,
  flattenAdminNav,
  matchAdminNavPath,
} from "@/lib/admin/adminNavConfig";

const BOOKMARKS_KEY = "torp_admin_nav_bookmarks";

function readBookmarks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((h) => typeof h === "string") : [];
  } catch {
    return [];
  }
}

function writeBookmarks(list) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

const QUICK_ACTIONS = [
  { href: "/admin/content/create", label: "Create content" },
  { href: "/admin/community", label: "Moderation queue" },
  { href: "/admin/users", label: "Find user" },
  { href: "/admin/sponsors", label: "Add sponsor" },
];

export default function AdminPlatformNav() {
  const pathname = usePathname() || "";
  const [q, setQ] = useState("");
  const [bookmarks, setBookmarks] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(ADMIN_NAV_SECTIONS.filter((s) => s.children?.length).map((s) => [s.id, true])),
  );

  useEffect(() => {
    setBookmarks(readBookmarks());
  }, []);

  const flat = useMemo(() => flattenAdminNav(), []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ADMIN_NAV_SECTIONS;
    return flat.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        (item.keywords || []).some((k) => k.includes(needle)) ||
        item.href.toLowerCase().includes(needle),
    );
  }, [q, flat]);

  const crumbs = adminBreadcrumbs(pathname);
  const current = matchAdminNavPath(pathname);

  const toggleBookmark = useCallback(() => {
    const href = pathname.split("#")[0] || "/admin";
    setBookmarks((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [href, ...prev];
      writeBookmarks(next);
      return next;
    });
  }, [pathname]);

  const isBookmarked = bookmarks.includes(pathname.split("#")[0] || "/admin");

  function isActive(item) {
    const prefix = item.matchPrefix || item.href;
    if (item.href === "/admin") return pathname === "/admin";
    return pathname === item.href || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix);
  }

  return (
    <div className="adminPlatformNav">
      <div className="adminPlatformNav__toolbar">
        <input
          type="search"
          className="adminConsoleInput adminPlatformNav__search"
          placeholder="Search admin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search admin sections"
        />
        <details className="adminPlatformNav__quick">
          <summary className="btnSoft">Quick actions</summary>
          <div className="adminPlatformNav__quickMenu">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} onClick={() => setMobileOpen(false)}>
                {a.label}
              </Link>
            ))}
          </div>
        </details>
        <button type="button" className="btnSoft adminPlatformNav__menuBtn" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? "Close menu" : "Menu"}
        </button>
      </div>

      <nav className="adminPlatformNav__breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.href + i}>
            {i > 0 ? <span className="adminMuted"> / </span> : null}
            {i < crumbs.length - 1 ? (
              <Link href={c.href}>{c.label}</Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </span>
        ))}
        <button
          type="button"
          className="btnSoft adminPlatformNav__bookmarkBtn"
          onClick={toggleBookmark}
          title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
        >
          {isBookmarked ? "★ Saved" : "☆ Save"}
        </button>
      </nav>

      {bookmarks.length > 0 ? (
        <div className="adminPlatformNav__bookmarks">
          <span className="adminMuted" style={{ fontSize: "0.75rem", marginRight: 8 }}>
            Bookmarks:
          </span>
          {bookmarks.map((href) => {
            const item = flat.find((f) => f.href === href) || { label: href, href };
            return (
              <Link key={href} href={href} className="adminPlatformNav__bookmarkLink">
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className={`adminPlatformNav__body${mobileOpen ? " isOpen" : ""}`}>
        {q.trim() ? (
          <div className="adminConsoleNav adminConsoleNav--search">
            {filtered.map((item) => (
              <Link
                key={item.id + item.href}
                href={item.href}
                className={isActive(item) ? "isActive" : ""}
                onClick={() => {
                  setQ("");
                  setMobileOpen(false);
                }}
              >
                {item.searchLabel || item.label}
                {item.readiness === "placeholder" ? (
                  <span className="adminNavBadge">Soon</span>
                ) : item.readiness === "partial" ? (
                  <span className="adminNavBadge adminNavBadge--partial">Beta</span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          ADMIN_NAV_SECTIONS.map((section) => {
            const active = isActive(section);
            const hasChildren = section.children?.length;
            const open = expanded[section.id] !== false;
            return (
              <div key={section.id} className="adminPlatformNav__section">
                <div className="adminPlatformNav__sectionHead">
                  <Link
                    href={section.href}
                    className={active ? "isActive" : ""}
                    onClick={() => setMobileOpen(false)}
                  >
                    {section.label}
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      className="adminPlatformNav__toggle"
                      aria-expanded={open}
                      onClick={() => setExpanded((e) => ({ ...e, [section.id]: !open }))}
                    >
                      {open ? "−" : "+"}
                    </button>
                  ) : null}
                </div>
                {hasChildren && open ? (
                  <div className="adminPlatformNav__children">
                    {section.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className={pathname.startsWith(child.href.split("#")[0]) ? "isActive" : ""}
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                        {child.readiness === "placeholder" ? (
                          <span className="adminNavBadge">Soon</span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {current?.readiness && current.readiness !== "production" ? (
        <p className="adminMuted adminPlatformNav__readiness" style={{ fontSize: "0.75rem", marginTop: 8 }}>
          Current page: {current.readiness === "placeholder" ? "Planned module" : "Partial / beta"}
        </p>
      ) : null}
    </div>
  );
}
