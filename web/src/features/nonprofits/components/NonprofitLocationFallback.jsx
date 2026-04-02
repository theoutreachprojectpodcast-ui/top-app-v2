function toDisplayLocation(value = "") {
  const text = String(value || "").trim();
  if (!text) return "Unknown";

  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  const city = parts[0] || "";
  const state = (parts[1] || "").toUpperCase();

  if (city && state) {
    const full = `${city}, ${state}`;
    if (full.length <= 14) return full;
    const cityToken = city.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "LOC";
    return `${cityToken} ${state.slice(0, 2) || "US"}`;
  }

  if (state) return state.slice(0, 2) || "US";
  if (city.length <= 12) return city;
  return `${city.slice(0, 3).toUpperCase()}...`;
}

export default function NonprofitLocationFallback({ text = "Unknown Location" }) {
  const shortText = toDisplayLocation(text);
  return (
    <div className="nonprofitAvatarFallback" aria-label={`Fallback location ${text}`}>
      <span>{shortText}</span>
    </div>
  );
}
