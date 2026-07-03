/** @param {string} code */
export function workosOAuthErrorMessage(code, description = "") {
  const c = String(code || "").trim().toLowerCase();
  const desc = String(description || "").trim();
  const descLower = desc.toLowerCase();
  if (c === "access_denied") return "Sign in was cancelled.";
  if (descLower.includes("rate limit") || descLower.includes("too many")) {
    return "Too many sign-in attempts. Wait a few minutes, then request a new verification code.";
  }
  if (descLower.includes("email") && (descLower.includes("deliver") || descLower.includes("send"))) {
    return "We could not send a verification code to that email. Check the address or try password sign-in.";
  }
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

/** User-facing copy for mobile splash `oauth_error` query param. */
export function mobileOAuthSplashErrorMessage(raw) {
  const msg = String(raw || "").trim();
  if (!msg) return "";
  if (msg.toLowerCase().includes("auth cookie missing") || msg.toLowerCase().includes("timed out")) {
    return "Sign-in timed out. Tap Sign in again — you'll stay in the app.";
  }
  return msg;
}
