"use client";

import { useEffect, useState } from "react";
import { pageContentBlockHtml, pickPageContentBlock } from "@/lib/content/publicPageContentBlocks";
import { sanitizeAdminHtml } from "@/lib/admin/sanitizeHtml";

/**
 * Renders an approved page_content_blocks row for a page/section on the live site.
 * Falls back to `fallback` when no approved block exists.
 */
export default function PublicPageContentSlot({
  pageKey,
  sectionKey = "main",
  className = "",
  as: Tag = "div",
  fallback = null,
}) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams({ pageKey: String(pageKey || "") });
    if (sectionKey) params.set("sectionKey", String(sectionKey));
    fetch(`/api/page-content?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (!mounted) return;
        const rows = Array.isArray(body?.rows) ? body.rows : [];
        const block = pickPageContentBlock(rows, sectionKey);
        const raw = pageContentBlockHtml(block);
        setHtml(raw ? sanitizeAdminHtml(raw) : "");
      })
      .catch(() => {
        if (mounted) setHtml("");
      });
    return () => {
      mounted = false;
    };
  }, [pageKey, sectionKey]);

  if (!html) return fallback;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
