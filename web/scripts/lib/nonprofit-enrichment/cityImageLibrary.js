const fs = require("fs");
const path = require("path");
const { isValidImageUrl } = require("./mediaValidation");

function toCitySlug(city = "", state = "") {
  return `${city}-${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wikiTitle(city = "", state = "") {
  const cleanCity = String(city || "").trim();
  const cleanState = String(state || "").trim();
  return `${cleanCity}, ${cleanState}`;
}

async function resolveCityImage(city, state) {
  const title = wikiTitle(city, state);
  if (!city || !state) return { imageUrl: "", source: "none" };
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1200&titles=${encodeURIComponent(title)}`;
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) return { imageUrl: "", source: "none" };
    const json = await res.json();
    const pages = Object.values(json?.query?.pages || {});
    const source = String(pages?.[0]?.thumbnail?.source || "");
    if (!source) return { imageUrl: "", source: "none" };
    const ok = await isValidImageUrl(source);
    return ok ? { imageUrl: source, source: "wikipedia-pageimage" } : { imageUrl: "", source: "none" };
  } catch {
    return { imageUrl: "", source: "none" };
  }
}

function saveLocalCityLibrary(library) {
  const outputPath = path.join(process.cwd(), "data", "city-images.generated.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(library, null, 2));
  return outputPath;
}

module.exports = {
  resolveCityImage,
  saveLocalCityLibrary,
  toCitySlug,
};
