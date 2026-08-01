/**
 * Status line under the homepage directory search bar.
 * Always reflects the full filtered total (not the current page length).
 */
export function formatDirectoryFoundStatus(count, { stateLabel: label = "" } = {}) {
  const prefix = label ? `${label} — ` : "";
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return null;
  }
  const n = Math.floor(count);
  const word = n === 1 ? "organization" : "organizations";
  return `${prefix}${n.toLocaleString()} ${word} found`;
}

export function formatDirectorySearchingStatus(stateLabelText = "") {
  const prefix = stateLabelText ? `${stateLabelText} — ` : "";
  return `${prefix}calculating total...`;
}

export function formatDirectoryCountUnavailableStatus(stateLabelText = "") {
  const prefix = stateLabelText ? `${stateLabelText} — ` : "";
  return `${prefix}total unavailable`;
}
