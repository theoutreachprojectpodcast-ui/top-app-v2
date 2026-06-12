/** @param {string} code */
export function workosOAuthErrorMessage(code, description = "") {
  const c = String(code || "").trim().toLowerCase();
  const desc = String(description || "").trim();
  if (c === "access_denied") return "Sign in was cancelled.";
  if (c === "invalid_request" && desc) return desc;
  if (c === "invalid_request") return "Sign-in request was invalid. Please try again.";
  if (c === "invalid_redirect_uri") {
    return "Sign-in redirect is not configured. Contact support if this keeps happening.";
  }
  if (c === "unauthorized_client") return "This app is not authorized for sign-in. Contact support.";
  if (desc) return desc;
  if (c) return `Sign in failed (${c}). Please try again.`;
  return "Could not complete sign in. Please try again.";
}

/**
 * User-facing copy for WorkOS callback failures (AuthKit throws generic Error messages).
 * @param {unknown} error
 */
export function workosCallbackErrorMessage(error) {
  const msg = error instanceof Error ? error.message : String(error || "");
  if (msg.includes("Auth cookie missing")) {
    return "Sign-in timed out. Tap Try again — you'll stay in the app.";
  }
  if (msg.includes("OAuth state mismatch")) {
    return "Sign-in state did not match. Please try again from the app.";
  }
  if (msg.includes("Missing required auth parameter")) {
    return "Incomplete sign-in response. Please try again.";
  }
  if (msg.includes("Missing sign-in response")) {
    return "Incomplete sign-in response. Please try again.";
  }
  if (msg.includes("response is missing tokens")) {
    return "Sign-in did not return a session. Please try again.";
  }
  if (msg.includes("Cannot read properties of undefined") || msg.includes("reading 'get'")) {
    return "Could not complete sign in. Please try again.";
  }
  if (msg.includes(" is not defined")) {
    return "Could not complete sign in. Please try again.";
  }
  if (msg.trim()) return msg;
  return "Could not complete sign in. Please try again.";
}
