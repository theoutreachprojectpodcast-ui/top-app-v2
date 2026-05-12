/**
 * Coordinates body wash accents via `data-page-atmosphere` on `main.topApp`.
 * Cinematic full-bleed photography + transparent header occlusion apply to every `main.topApp`
 * except podcast (`appShell--podcast` or `data-page-atmosphere="podcast"`) — see `top-app.css`.
 *
 * **Podcast exclusion (global background + immersive header scroll):** any route with
 * `pathname` starting `/podcasts`, or `nav === "podcast"`, or shells passing `pageAtmosphere="podcast"` /
 * `shellClassName` containing `appShell--podcast`, must not use the main-app atmosphere (see
 * `useImmersiveHeaderScroll`, `PodcastsLandingPage`, `podcasts.css`).
 *
 * @param {string | undefined} pathname
 * @param {string | undefined} nav — TopApp tab key
 * @returns {"home"|"trusted"|"community"|"profile"|"contact"|"sponsors"|"podcast"|"default"}
 */
export function resolvePageAtmosphere(pathname, nav) {
  const p = String(pathname || "").toLowerCase();
  if (p.startsWith("/podcasts")) return "podcast";
  if (p.startsWith("/sponsors")) return "sponsors";
  if (p.startsWith("/trusted")) return "trusted";
  if (p.startsWith("/community")) return "community";
  if (p.startsWith("/contact")) return "contact";
  if (p.startsWith("/profile") || p.startsWith("/settings")) return "profile";
  if (p.startsWith("/admin")) return "default";
  const n = String(nav || "home").toLowerCase();
  if (n === "sponsors" || n === "podcast") return n;
  if (n === "trusted" || n === "community" || n === "profile" || n === "contact") return n;
  return "home";
}
