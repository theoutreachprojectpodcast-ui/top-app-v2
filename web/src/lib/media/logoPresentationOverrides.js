import { getCatalogLogoPresentation } from "@/lib/media/logoPresentationCatalog";

/**
 * @typedef {import("./logoPresentationCatalog.js").LogoPresentationEntry} LogoPresentationOverride
 */

/**
 * @param {string} entityKey
 * @param {string} [_src]
 * @returns {LogoPresentationOverride | null}
 */
export function getLogoPresentationOverride(entityKey, _src = "") {
  return getCatalogLogoPresentation(entityKey);
}

/**
 * @param {LogoPresentationOverride | null | undefined} manual
 * @param {object} assessed
 * @param {{ panel?: string, surface?: string }} context
 */
export function mergeLogoPresentation(manual, assessed, context = {}) {
  const panel =
    context.panel && context.panel !== "auto"
      ? context.panel
      : manual?.panel && manual.panel !== "auto"
        ? manual.panel
        : "auto";

  let bgColor = assessed.bgColor;
  let pad = assessed.pad;
  let scale = assessed.scale || 1;
  let fit = assessed.fit || "contain";
  let focusX = assessed.focusX ?? 50;
  let focusY = assessed.focusY ?? 50;

  if (manual) {
    if (manual.bgColor) bgColor = manual.bgColor;
    if (manual.pad != null) pad = manual.pad;
    if (manual.scale != null) scale = manual.scale;
    if (manual.fit) fit = manual.fit;
    if (manual.focusX != null) focusX = manual.focusX;
    if (manual.focusY != null) focusY = manual.focusY;
  }

  if (panel === "light") bgColor = manual?.bgColor || "#f8fafc";
  if (panel === "dark") bgColor = manual?.bgColor || "#0a0a0a";
  if (fit === "cover" && pad == null) pad = 0;

  return {
    bgColor,
    pad: pad ?? 8,
    scale,
    fit,
    tone: assessed.tone || "normal",
    borderColor: manual?.borderColor || "",
    minimalFrame: !!manual?.minimalFrame,
    panel,
    focusX,
    focusY,
  };
}
