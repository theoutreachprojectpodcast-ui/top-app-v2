/**
 * Optional Google Programmable Search (Custom Search JSON API) for corroborating snippets.
 * Configure GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID (server-only).
 * Candidates are not display-ready until verifyPublicSearchCandidate passes.
 */
export async function fetchPublicSearchCandidates({ query, limit = 6 }) {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  if (!key || !cx || !String(query || "").trim()) {
    return { ok: false, configured: false, candidates: [], reason: "search_not_configured" };
  }

  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", key);
  u.searchParams.set("cx", cx);
  u.searchParams.set("q", String(query).trim());
  u.searchParams.set("num", String(Math.min(Math.max(1, limit), 10)));

  try {
    const res = await fetch(u.toString(), { method: "GET" });
    if (!res.ok) {
      return { ok: false, configured: true, candidates: [], error: `http_${res.status}` };
    }
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      ok: true,
      configured: true,
      candidates: items.map((i) => ({
        title: String(i.title || "").trim(),
        snippet: String(i.snippet || "").trim(),
        link: String(i.link || "").trim(),
        displayLink: String(i.displayLink || "").trim(),
      })),
    };
  } catch {
    return { ok: false, configured: true, candidates: [], error: "network_error" };
  }
}
