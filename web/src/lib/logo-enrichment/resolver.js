function toDomain(website = "") {
  const raw = String(website || "").trim();
  if (!raw) return "";
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(value);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function getLogoCandidates(website = "") {
  const domain = toDomain(website);
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
  ];
}

