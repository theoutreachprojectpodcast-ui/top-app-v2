import { safeUrl } from "@/lib/utils";

/**
 * Prefer the nonprofit official website when present on the card model; otherwise fall back to a scoped web search.
 */
export function resolveFindInfoHref(card) {
  if (!card) return "https://www.google.com/search?q=nonprofit";
  const site = card.links?.find((l) => l.type === "website")?.url;
  const url = safeUrl(site);
  if (url) return url;
  const q = encodeURIComponent(`${card.name} ${card.city} ${card.state} nonprofit`.trim());
  return `https://www.google.com/search?q=${q}`;
}
