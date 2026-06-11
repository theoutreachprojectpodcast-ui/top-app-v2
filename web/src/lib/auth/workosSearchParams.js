/**
 * @param {Record<string, string | string[] | undefined> | URLSearchParams} raw
 * @returns {URLSearchParams}
 */
export function toWorkOSUrlSearchParams(raw) {
  if (raw instanceof URLSearchParams) return raw;
  const params = new URLSearchParams();
  if (!raw || typeof raw !== "object") return params;
  for (const [key, val] of Object.entries(raw)) {
    if (val == null) continue;
    if (Array.isArray(val)) {
      if (val[0]) params.set(key, String(val[0]));
    } else {
      params.set(key, String(val));
    }
  }
  return params;
}
