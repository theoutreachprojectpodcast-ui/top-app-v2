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
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return {
    r,
    g,
    b,
    a: alpha,
    luma: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
    sat: max === 0 ? 0 : (max - min) / max,
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
    return { fill: 0, fillW: 0, fillH: 0, aspect: 1, minX: 0, minY: 0, maxX: width, maxY: height };
  }

  const boxW = Math.max(1, maxX - minX + 1);
  const boxH = Math.max(1, maxY - minY + 1);
  return {
    fill: opaque / (width * height),
    fillW: boxW / width,
    fillH: boxH / height,
    aspect: boxW / boxH,
    minX,
    minY,
    maxX,
    maxY,
    boxW,
    boxH,
  };
}

/** Sample matte from corners — skip near-white if the mark is clearly photo-backed. */
function sampleMatteColor(data, width, height, bounds, photoBacked) {
  const corners = [];
  const cornerSize = Math.max(2, Math.floor(Math.min(width, height) * 0.16));

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
      if (inCorner) corners.push(px);
    }
  }

  if (!corners.length) return null;

  const avg = averageColors(corners);
  if (!avg) return null;

  const spread = corners.reduce((max, px) => Math.max(max, colorDistance(px, avg)), 0);
  if (spread > 78) return null;

  const luma = corners.reduce((s, px) => s + px.luma, 0) / corners.length;
  const sat = corners.reduce((s, px) => s + px.sat, 0) / corners.length;

  if (photoBacked && luma > 0.82) {
    return sampleEdgeMutedColor(data, width, height, bounds);
  }

  return { hex: rgbToHex(avg.r, avg.g, avg.b), luma, sat };
}

/** Dark/muted edge color for photo-backed marks (avoids white sky gutters). */
function sampleEdgeMutedColor(data, width, height, bounds) {
  const edge = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 24));

  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const px = readPixel(data, (y * width + x) * 4);
      if (px) edge.push(px);
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      const px = readPixel(data, (y * width + x) * 4);
      if (px) edge.push(px);
    }
  }

  const ranked = edge
    .filter((px) => px.sat > 0.06)
    .sort((a, b) => a.luma - b.luma);
  const pool = ranked.length >= 6 ? ranked.slice(0, Math.ceil(ranked.length * 0.35)) : edge;
  const avg = averageColors(pool);
  if (!avg) return null;

  const darken = 0.72;
  return {
    hex: rgbToHex(avg.r * darken, avg.g * darken, avg.b * darken),
    luma: (avg.r + avg.g + avg.b) / (3 * 255),
    sat: 0.2,
  };
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

function recommendPad(aspect, fill, fit) {
  if (fit === "cover") return 0;
  if (aspect >= 1.65) return 5;
  if (aspect >= 1.28) return 6;
  if (aspect <= 0.62) return 5;
  if (aspect <= 0.78) return 6;
  if (fill >= 0.72) return 4;
  if (fill >= 0.5) return 7;
  return 8;
}

function recommendFraming(bounds, samples, matte) {
  const avgSat = samples.length
    ? samples.reduce((s, px) => s + px.sat, 0) / samples.length
    : 0;
  const photoBacked = bounds.fill > 0.9 && avgSat > 0.16;
  const letterboxX = bounds.fillW < 0.86;
  const letterboxY = bounds.fillH < 0.86;

  if (photoBacked || letterboxX || letterboxY) {
    const zoomX = letterboxX ? clamp(1 / bounds.fillW, 1.04, 1.42) : 1;
    const zoomY = letterboxY ? clamp(1 / bounds.fillH, 1.04, 1.42) : 1;
    return {
      fit: "cover",
      pad: 0,
      scale: clamp(Math.max(zoomX, zoomY, photoBacked ? 1.06 : 1), 1, 1.38),
      photoBacked,
    };
  }

  return {
    fit: "contain",
    pad: null,
    scale: bounds.fill >= 0.82 && bounds.aspect > 0.88 && bounds.aspect < 1.12 ? 1.02 : 1,
    photoBacked: false,
  };
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
 * Analyze logo artwork for per-mark framing: matte color, padding, tone, fit.
 * @param {HTMLImageElement} imgEl
 * @param {{ surface?: string }} [options]
 */
export function assessLogoPresentationFromElement(imgEl, options = {}) {
  const surface = options.surface || "page";
  const empty = {
    bgColor: fallbackBg("normal", surface),
    pad: 8,
    tone: "normal",
    scale: 1,
    fit: "contain",
    aspect: 1,
  };

  if (!imgEl?.naturalWidth || !imgEl?.naturalHeight) return empty;

  const canvas = document.createElement("canvas");
  const width = Math.min(96, imgEl.naturalWidth);
  const height = Math.min(96, imgEl.naturalHeight);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return empty;

  try {
    ctx.drawImage(imgEl, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const samples = [];
    for (let i = 0; i < data.length; i += 4) {
      const px = readPixel(data, i);
      if (px) samples.push(px);
    }

    const bounds = measureContentBounds(data, width, height);
    const framing = recommendFraming(bounds, samples, null);
    const matte = sampleMatteColor(data, width, height, bounds, framing.photoBacked);
    const tone = classifyTone(samples, matte);
    const pad = framing.pad ?? recommendPad(bounds.aspect, bounds.fill, framing.fit);
    const bgColor = matte?.hex || fallbackBg(tone, surface);

    return {
      bgColor,
      pad,
      tone,
      scale: framing.scale,
      fit: framing.fit,
      aspect: bounds.aspect,
    };
  } catch {
    return empty;
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
  const prev = presentationCache.get(key) || {
    bgColor: "#f8fafc",
    pad: 8,
    tone: "normal",
    scale: 1,
    fit: "contain",
  };
  presentationCache.set(key, { ...prev, tone });
}
