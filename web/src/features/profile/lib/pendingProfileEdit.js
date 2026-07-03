/** Survives TopApp remounts (e.g. `useSearchParams` + Suspense) when opening profile edit from deep links. */
export const PROFILE_EDIT_PENDING_KEY = "top-profile-edit-pending";
export const PROFILE_EDIT_OPEN_KEY = "top-profile-edit-open";

function storageSet(key, value) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function storageRemove(key) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Modal is open — survives route changes until explicit close. */
export function markProfileEditOpen() {
  storageSet(PROFILE_EDIT_OPEN_KEY, "1");
}

export function clearProfileEditOpen() {
  storageRemove(PROFILE_EDIT_OPEN_KEY);
}

export function isProfileEditOpen() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(PROFILE_EDIT_OPEN_KEY) === "1" ||
      sessionStorage.getItem("torp-profile-edit-open") === "1"
    );
  } catch {
    return false;
  }
}

/**
 * @param {{ focus?: string, section?: string }} payload
 */
export function markPendingProfileEdit(payload = {}) {
  storageSet(
    PROFILE_EDIT_PENDING_KEY,
    JSON.stringify({
      focus: String(payload.focus || "").trim(),
      section: String(payload.section || "").trim(),
    }),
  );
}

/** @returns {{ focus: string, section: string } | null} */
export function peekPendingProfileEdit() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(PROFILE_EDIT_PENDING_KEY) ||
      sessionStorage.getItem("torp-profile-edit-pending");
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
  storageRemove(PROFILE_EDIT_PENDING_KEY);
}

export function clearProfileEditSessionHints() {
  clearPendingProfileEdit();
  clearProfileEditOpen();
}
