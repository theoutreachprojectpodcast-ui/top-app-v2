/** Survives TopApp remounts (e.g. `useSearchParams` + Suspense) when opening profile edit from deep links. */
export const PROFILE_EDIT_PENDING_KEY = "torp-profile-edit-pending";

/**
 * @param {{ focus?: string, section?: string }} payload
 */
export function markPendingProfileEdit(payload = {}) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      PROFILE_EDIT_PENDING_KEY,
      JSON.stringify({
        focus: String(payload.focus || "").trim(),
        section: String(payload.section || "").trim(),
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

/** @returns {{ focus: string, section: string } | null} */
export function peekPendingProfileEdit() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PROFILE_EDIT_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      focus: String(parsed.focus || "").trim(),
      section: String(parsed.section || "").trim(),
    };
  } catch {
    return null;
  }
}

export function clearPendingProfileEdit() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(PROFILE_EDIT_PENDING_KEY);
  } catch {
    /* ignore */
  }
}
