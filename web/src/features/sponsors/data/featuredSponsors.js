/** Demo / placeholder featured sponsors for the sponsor landing view. */
function sponsorAvatar(bg, fg, label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'><rect width='100%' height='100%' fill='${bg}'/><circle cx='180' cy='138' r='74' fill='${fg}' opacity='0.22'/><text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif' font-size='92' fill='${fg}' font-weight='700'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function sponsorBg(a, b, title) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1400' height='760'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${a}'/><stop offset='100%' stop-color='${b}'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><rect x='52' y='52' width='1296' height='656' rx='22' fill='rgba(6,9,12,0.28)' stroke='rgba(236,238,241,0.22)'/><text x='84' y='126' font-family='Segoe UI, Arial, sans-serif' font-size='52' fill='rgba(255,255,255,0.9)' font-weight='700'>${title}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const FEATURED_SPONSORS = [
  {
    id: "1",
    name: "Summit Ridge Security",
    tag: "Veteran-founded",
    initials: "SR",
    logoIcon: "SR",
    tierLabel: "Mission sponsor",
    tagline: "Operational resilience solutions supporting first-responder communities.",
    ctaLabel: "Sponsor spotlight",
    ctaUrl: "https://example.com/summit-ridge",
    brandPrimary: "#d7a957",
    brandSecondary: "#2f8f96",
    profileImageUrl: sponsorAvatar("#243944", "#f5d698", "SR"),
    backgroundImageUrl: sponsorBg("#1d3d47", "#2e6675", "Summit Ridge Security"),
  },
  {
    id: "2",
    name: "Harborline Health",
    tag: "Behavioral health",
    initials: "HH",
    logoIcon: "HH",
    tierLabel: "Featured support",
    tagline: "Mental wellness networks for veterans, families, and frontline professionals.",
    ctaLabel: "Visit sponsor",
    ctaUrl: "https://example.com/harborline",
    brandPrimary: "#7db7d9",
    brandSecondary: "#4a6d8a",
    profileImageUrl: sponsorAvatar("#24344a", "#b8ddff", "HH"),
    backgroundImageUrl: sponsorBg("#264966", "#537fa3", "Harborline Health"),
  },
  {
    id: "3",
    name: "Atlas Gear Co.",
    tag: "Outdoor + resilience",
    initials: "AG",
    logoIcon: "AG",
    tierLabel: "Premier support",
    tagline: "Field-ready equipment and recovery programs for high-stress service roles.",
    ctaLabel: "Learn more",
    ctaUrl: "https://example.com/atlas-gear",
    brandPrimary: "#e4bc5c",
    brandSecondary: "#6d4a2d",
    profileImageUrl: sponsorAvatar("#3b2f24", "#f6d39d", "AG"),
    backgroundImageUrl: sponsorBg("#5f3d25", "#8f6138", "Atlas Gear Co."),
  },
];

