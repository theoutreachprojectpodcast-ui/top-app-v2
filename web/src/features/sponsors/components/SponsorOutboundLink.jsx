"use client";

function logSponsorClick(payload) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/sponsors/click", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/sponsors/click", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* best-effort analytics */
  }
}

/**
 * Tracked outbound sponsor link — logs click then follows href.
 */
export default function SponsorOutboundLink({
  href,
  sponsorSlug,
  sponsorName = "",
  pageSource = "main_sponsor_page",
  ctaType = "website",
  className,
  children,
  onClick,
  ...rest
}) {
  const url = String(href || "").trim();
  if (!url) return null;

  return (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        logSponsorClick({
          sponsorSlug: String(sponsorSlug || "").trim(),
          sponsorName: String(sponsorName || "").trim(),
          pageSource,
          ctaType,
          targetUrl: url,
        });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
