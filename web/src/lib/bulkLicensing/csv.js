/**
 * CSV helpers for bulk license assignment and export.
 * Guards against spreadsheet formula injection.
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeCsvCell(value) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * @param {string[]} headers
 * @param {Array<Array<unknown>>} rows
 */
export function buildCsv(headers, rows) {
  const lines = [headers.map(sanitizeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(sanitizeCsvCell).join(","));
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Parse CSV of emails (first column, or header "email").
 * @param {string} text
 * @returns {{ emails: string[], errors: Array<{ row: number, message: string }>, duplicates: string[] }}
 */
export function parseEmailCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  /** @type {string[]} */
  const emails = [];
  /** @type {Array<{ row: number, message: string }>} */
  const errors = [];
  const seen = new Set();
  /** @type {string[]} */
  const duplicates = [];

  let start = 0;
  if (lines[0] && /^email$/i.test(lines[0].split(/[,;\t]/)[0].replace(/^"|"$/g, "").trim())) {
    start = 1;
  }

  for (let i = start; i < lines.length; i += 1) {
    const rowNum = i + 1;
    const first = lines[i].split(/[,;\t]/)[0].replace(/^"|"$/g, "").trim().toLowerCase();
    if (!first) {
      errors.push({ row: rowNum, message: "Empty email" });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first)) {
      errors.push({ row: rowNum, message: `Invalid email: ${first}` });
      continue;
    }
    if (seen.has(first)) {
      duplicates.push(first);
      continue;
    }
    seen.add(first);
    emails.push(first);
  }

  return { emails, errors, duplicates };
}
