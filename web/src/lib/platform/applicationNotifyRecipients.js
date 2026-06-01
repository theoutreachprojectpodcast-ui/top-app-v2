/** Default inboxes for platform application forms (mission partner, podcast sponsor, podcast guest). */
export const DEFAULT_APPLICATION_NOTIFY_RECIPIENTS = [
  "jmelching1@gmail.com",
  "hodge5403@gmail.com",
  "andy@volentelabs.com",
];

function parseRecipientList(raw) {
  return String(raw || "")
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("@"));
}

/**
 * Shared routing for application notification emails.
 * Override with APPLICATION_NOTIFY_RECIPIENTS (comma-separated).
 * Legacy env vars still supported for backward compatibility.
 *
 * @returns {string[]}
 */
export function resolveApplicationNotifyRecipients() {
  for (const key of [
    "APPLICATION_NOTIFY_RECIPIENTS",
    "MISSION_PARTNER_APPLICATION_RECIPIENTS",
    "PODCAST_GUEST_APPLICATION_RECIPIENTS",
    "PODCAST_GUEST_APPLICATION_RECIPIENT",
  ]) {
    const parsed = parseRecipientList(process.env[key]);
    if (parsed.length) return parsed;
  }
  return [...DEFAULT_APPLICATION_NOTIFY_RECIPIENTS];
}
