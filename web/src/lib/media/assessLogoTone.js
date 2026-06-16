const toneCache = new Map();

export function getCachedLogoTone(src) {
  const key = String(src || "").trim();
  if (!key) return null;
  return toneCache.has(key) ? toneCache.get(key) : null;
}

export function setCachedLogoTone(src, tone) {
  const key = String(src || "").trim();
  if (!key) return;
  toneCache.set(key, tone);
}

/** Classify logo artwork for shell contrast (lightmono / darkmono / highsat / normal). */
export function assessLogoToneFromElement(imgEl) {
  if (!imgEl?.naturalWidth || !imgEl?.naturalHeight) return "normal";
  const canvas = document.createElement("canvas");
  canvas.width = 30;
  canvas.height = 30;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "normal";

  try {
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let samples = 0;
    let lumaSum = 0;
    let satSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha < 0.28) continue;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      samples += 1;
      lumaSum += luma;
      satSum += sat;
    }

    if (!samples) return "normal";
    const avgLuma = lumaSum / samples;
    const avgSat = satSum / samples;

    if (avgLuma >= 0.9 && avgSat <= 0.11) return "lightmono";
    if (avgLuma <= 0.16 && avgSat <= 0.15) return "darkmono";
    if (avgSat >= 0.42 && avgLuma >= 0.2 && avgLuma <= 0.85) return "highsat";
    return "normal";
  } catch {
    return "normal";
  }
}
