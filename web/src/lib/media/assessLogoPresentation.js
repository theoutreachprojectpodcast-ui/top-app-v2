const presentationCache = new Map();

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function rgbToHex(r, g, b) {
  const to = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function readPixel(data, i) {
  const alpha = data[i + 3] / 255;
  if (alpha < 0.35) return null;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2],
    a: alpha,
    luma: (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255,
    sat: (() => {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return max === 0 ? 0 : (max - min) / max;
    })(),
  };
}

function averageColors(colors) {
  if (!colors.length) return null;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  const n = colors.length;
  return { r: r / n, g: g / n, b: b / n };
}

/** Sample matte color from corners and outer rim of logo artwork. */
function sampleMatteColor(data, width, height) {
  const corners = [];
  const rim = [];
  const cornerSize = Math.max(2, Math.floor(Math.min(width, height) * 0.18));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const px = readPixel(data, i);
      if (!px) continue;
      const inCorner =
        (x < cornerSize && y < cornerSize) ||
        (x >= width - cornerSize && y < cornerSize) ||
        (x < cornerSize && y >= height - cornerSize) ||
        (x >= width - cornerSize && y >= height - cornerSize);
      const onRim = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      if (inCorner) corners.push(px);
      else if (onRim) rim.push(px);
    }
  }

  const cornerAvg = averageColors(corners);
  const rimAvg = averageColors(rim);
  const pool = corners.length >= 8 ? corners : rim.length >= 8 ? rim : [...corners, ...rim];
  if (!pool.length) return null;

  const avg = averageColors(pool);
  if (!avg) return null;

  const spread = pool.reduce((max, px) => Math.max(max, colorDistance(px, avg)), 0);
  if (spread > 72) return null;

  return {
    hex: rgbToHex(avg.r, avg.g, avg.b),
    luma: pool.reduce((s, px) => s + px.luma, 0) / pool.length,
    sat: pool.reduce((s, px) => s + px.sat, 0) / pool.length,
  };
}

function measureContentBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let opaque = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3] / 255 < 0.2) continue;
      opaque += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!opaque) {
    return { fill: 0, aspect: 1 };
  }

  const boxW = Math.max(1, maxX - minX + 1);
  const boxH = Math.max(1, maxY - minY + 1);
  return {
    fill: opaque / (width * height),
    aspect: boxW / boxH,
  };
}

function recommendPad(aspect, fill) {
  if (aspect >= 1.65) return 5;
  if (aspect >= 1.28) return 6;
  if (aspect <= 0.62) return 5;
  if (aspect <= 0.78) return 6;
  if (fill >= 0.72) return 4;
  if (fill >= 0.5) return 7;
  return 9;
}

function classifyTone(samples, matte) {
  if (matte) {
    if (matte.luma >= 0.9 && matte.sat <= 0.12) return "lightmono";
    if (matte.luma <= 0.14 && matte.sat <= 0.14) return "darkmono";
    if (matte.sat >= 0.38) return "colorful";
    return "normal";
  }

  let count = 0;
  let lumaSum = 0;
  let satSum = 0;
  for (const px of samples) {
    count += 1;
    lumaSum += px.luma;
    satSum += px.sat;
  }
  if (!count) return "normal";
  const avgLuma = lumaSum / count;
  const avgSat = satSum / count;
  if (avgLuma >= 0.9 && avgSat <= 0.11) return "lightmono";
  if (avgLuma <= 0.16 && avgSat <= 0.15) return "darkmono";
  if (avgSat >= 0.42) return "colorful";
  return "normal";
}

function fallbackBg(tone, surface) {
  if (tone === "lightmono") return "#f4f6f8";
  if (tone === "darkmono") return "#0c1014";
  if (surface === "onDark") return "#0a100e";
  return "#f8fafc";
}

export function getCachedLogoPresentation(src) {
  const key = String(src || "").trim();
  if (!key) return null;
  return presentationCache.has(key) ? presentationCache.get(key) : null;
}

export function setCachedLogoPresentation(src, presentation) {
  const key = String(src || "").trim();
  if (!key || !presentation) return;
  presentationCache.set(key, presentation);
}

/**
 * Analyze logo artwork for per-mark framing: matte color, padding, tone.
 * @param {HTMLImageElement} imgEl
 * @param {{ surface?: string }} [options]
 */
export function assessLogoPresentationFromElement(imgEl, options = {}) {
  const surface = options.surface || "page";
  if (!imgEl?.naturalWidth || !imgEl?.naturalHeight) {
    return { bgColor: fallbackBg("normal", surface), pad: 9, tone: "normal", scale: 1 };
  }

  const canvas = document.createElement("canvas");
  const width = Math.min(72, imgEl.naturalWidth);
  const height = Math.min(72, imgEl.naturalHeight);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { bgColor: fallbackBg("normal", surface), pad: 9, tone: "normal", scale: 1 };
  }

  try {
    ctx.drawImage(imgEl, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const samples = [];
    for (let i = 0; i < data.length; i += 4) {
      const px = readPixel(data, i);
      if (px) samples.push(px);
    }

    const matte = sampleMatteColor(data, width, height);
    const bounds = measureContentBounds(data, width, height);
    const tone = classifyTone(samples, matte);
    const pad = recommendPad(bounds.aspect, bounds.fill);
    const bgColor = matte?.hex || fallbackBg(tone, surface);
    const scale = bounds.fill >= 0.82 && bounds.aspect > 0.88 && bounds.aspect < 1.12 ? 1.02 : 1;

    return { bgColor, pad, tone, scale, aspect: bounds.aspect };
  } catch {
    return { bgColor: fallbackBg("normal", surface), pad: 9, tone: "normal", scale: 1 };
  }
}

/** @deprecated Use assessLogoPresentationFromElement */
export function assessLogoToneFromElement(imgEl) {
  const { tone } = assessLogoPresentationFromElement(imgEl);
  return tone === "colorful" ? "highsat" : tone;
}

export function getCachedLogoTone(src) {
  const hit = getCachedLogoPresentation(src);
  if (!hit) return null;
  return hit.tone === "colorful" ? "highsat" : hit.tone;
}

export function setCachedLogoTone(src, tone) {
  const key = String(src || "").trim();
  if (!key) return;
  const prev = presentationCache.get(key) || { bgColor: "#f8fafc", pad: 9, tone: "normal", scale: 1 };
  presentationCache.set(key, { ...prev, tone });
}
