/**
 * Server-safe fetch of a nonprofit official website (HTML only).
 * @param {string} websiteUrl
 * @param {{ maxBytes?: number, timeoutMs?: number }} [opts]
 */
export async function fetchWebsiteHtml(websiteUrl, opts = {}) {
  const maxBytes = opts.maxBytes ?? 1_500_000;
  const timeoutMs = opts.timeoutMs ?? 18_000;
  let url = String(websiteUrl || "").trim();
  if (!url) return { ok: false, error: "missing_url", html: "" };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "invalid_url", html: "" };
  }
  if (!/^https?:$/i.test(parsed.protocol)) return { ok: false, error: "invalid_protocol", html: "" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(parsed.href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": "TheOutreachProject-Enrichment/1.0 (+https://theoutreach-project.org)",
      },
    });
    if (!res.ok) return { ok: false, error: `http_${res.status}`, html: "", finalUrl: res.url };
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return { ok: false, error: "not_html", html: "", finalUrl: res.url };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      return { ok: false, error: "too_large", html: "", finalUrl: res.url };
    }
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let html = decoder.decode(buf);
    if (html.includes("\uFFFD") && buf.byteLength > 0) {
      const dec2 = new TextDecoder("windows-1252", { fatal: false });
      html = dec2.decode(buf);
    }
    return { ok: true, error: "", html, finalUrl: res.url || parsed.href };
  } catch (e) {
    const msg = e?.name === "AbortError" ? "timeout" : "network_error";
    return { ok: false, error: msg, html: "" };
  } finally {
    clearTimeout(timer);
  }
}
