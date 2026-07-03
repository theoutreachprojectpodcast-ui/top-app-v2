"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { registerExternalBrowserSheetHost } from "@/lib/capacitor/externalBrowserSheetController";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import "@/styles/external-browser-sheet.css";

const IFRAME_BLOCKLIST =
  /(?:^|\.)google\.|(?:^|\.)facebook\.com|(?:^|\.)instagram\.com|(?:^|\.)twitter\.com|(?:^|\.)x\.com|(?:^|\.)stripe\.com/i;

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function canEmbedInFrame(url) {
  try {
    const host = new URL(url).hostname;
    return !IFRAME_BLOCKLIST.test(host);
  } catch {
    return false;
  }
}

/**
 * In-app browser sheet for mobile web — safe-area chrome + dismissible iframe.
 * Native Capacitor uses `@capacitor/browser` instead (see openExternalBrowserSheet).
 */
export default function ExternalBrowserSheetHost() {
  const [sheet, setSheet] = useState(null);
  const [frameBlocked, setFrameBlocked] = useState(false);
  const openedTabRef = useRef(null);

  const close = useCallback(() => {
    setSheet((current) => {
      current?.onClose?.();
      return null;
    });
    setFrameBlocked(false);
    openedTabRef.current = null;
  }, []);

  const openExternalTab = useCallback((url) => {
    if (typeof window === "undefined") return;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) openedTabRef.current = opened;
    else window.location.assign(url);
  }, []);

  useEffect(() => {
    return registerExternalBrowserSheetHost((req) => {
      const url = String(req?.url || "").trim();
      if (!url) return;
      if (isCapacitorNative()) return;

      const title = String(req?.title || "").trim() || hostFromUrl(url) || "External page";
      const doneLabel = String(req?.doneLabel || "Done").trim() || "Done";
      const onClose = typeof req?.onClose === "function" ? req.onClose : undefined;
      if (!canEmbedInFrame(url)) {
        openExternalTab(url);
        setFrameBlocked(true);
        setSheet({ url, title, doneLabel, onClose });
        return;
      }

      setFrameBlocked(false);
      setSheet({ url, title, doneLabel, onClose });
    });
  }, [openExternalTab]);

  useEffect(() => {
    if (!sheet) return undefined;
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet, close]);

  if (!sheet || isCapacitorNative()) return null;

  return (
    <div className="externalBrowserSheet" role="dialog" aria-modal="true" aria-label={sheet.title}>
      <header className="externalBrowserSheet__chrome">
        <button type="button" className="btnSoft externalBrowserSheet__done" onClick={close}>
          {sheet.doneLabel || "Done"}
        </button>
        <p className="externalBrowserSheet__title">{sheet.title}</p>
        <button
          type="button"
          className="btnSoft externalBrowserSheet__external"
          aria-label="Open in browser tab"
          onClick={() => openExternalTab(sheet.url)}
        >
          <ExternalLink size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>
      <div className="externalBrowserSheet__body">
        {frameBlocked ? (
          <div className="externalBrowserSheet__fallback">
            <p>This page opened in a new browser tab.</p>
            <p className="externalBrowserSheet__fallbackHint">
              Tap {sheet.doneLabel || "Done"} when you are finished to return to The Outreach Project.
            </p>
            <button type="button" className="btnPrimary" onClick={() => openExternalTab(sheet.url)}>
              Open again
            </button>
          </div>
        ) : (
          <iframe
            className="externalBrowserSheet__frame"
            src={sheet.url}
            title={sheet.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onError={() => setFrameBlocked(true)}
          />
        )}
      </div>
    </div>
  );
}
