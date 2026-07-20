/**
 * Support → Pro complimentary migration constants + pure helpers (safe for unit tests).
 */

export const SUPPORT_TO_PRO_MIGRATION_VERSION = "support_to_pro_2026_v1";
export const SUPPORT_TO_PRO_EMAIL_TEMPLATE_VERSION = "support_to_pro_v1";
export const SUPPORT_TO_PRO_MEMBERSHIP_SOURCE = "support_to_pro_migration";
export const SUPPORT_MEMBERSHIP_STATUS_MIGRATED = "migrated_to_pro";

export const MIGRATION_STATUS = {
  PENDING: "pending",
  ELIGIBLE: "eligible",
  MIGRATED: "migrated",
  SKIPPED_PAID_PRO: "skipped_paid_pro",
  SKIPPED_EXPIRED: "skipped_expired",
  EXCEPTION: "exception",
  EMAIL_FAILED: "email_failed",
};

/**
 * @param {number | string | Date | null | undefined} value
 * @returns {Date | null}
 */
export function toDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Stripe unix seconds vs ms
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Add one calendar year to a date (preserves time-of-day).
 * @param {Date} start
 * @returns {Date}
 */
export function addOneCalendarYear(start) {
  const end = new Date(start.getTime());
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

/**
 * Resolve original Support paid period from prioritized sources.
 * Prefer verified Stripe current_period_end when present.
 *
 * @param {{
 *   stripePeriodStart?: number | string | Date | null,
 *   stripePeriodEnd?: number | string | Date | null,
 *   checkoutCompletedAt?: number | string | Date | null,
 *   firstInvoicePaidAt?: number | string | Date | null,
 *   membershipActivatedAt?: number | string | Date | null,
 *   supportSignupAt?: number | string | Date | null,
 *   accountCreatedAt?: number | string | Date | null,
 *   profileRenewalDate?: number | string | Date | null,
 * }} sources
 * @returns {{
 *   start: Date | null,
 *   end: Date | null,
 *   startSource: string | null,
 *   endSource: string | null,
 * }}
 */
export function resolveOriginalSupportPeriod(sources = {}) {
  const candidates = [
    ["stripe_current_period_start", sources.stripePeriodStart],
    ["checkout_completed", sources.checkoutCompletedAt],
    ["first_invoice_paid", sources.firstInvoicePaidAt],
    ["membership_activated", sources.membershipActivatedAt],
    ["support_signup", sources.supportSignupAt],
    ["account_created", sources.accountCreatedAt],
  ];

  let start = null;
  let startSource = null;
  for (const [label, raw] of candidates) {
    const d = toDate(raw);
    if (d) {
      start = d;
      startSource = label;
      break;
    }
  }

  const stripeEnd = toDate(sources.stripePeriodEnd);
  const profileEnd = toDate(sources.profileRenewalDate);

  if (!start && !stripeEnd && !profileEnd) {
    return { start: null, end: null, startSource: null, endSource: null };
  }

  // Prefer Stripe period end when it represents the active annual term.
  if (stripeEnd) {
    if (!start) {
      start = addOneCalendarYearInverse(stripeEnd);
      startSource = "inferred_from_stripe_period_end";
    }
    return {
      start,
      end: stripeEnd,
      startSource,
      endSource: "stripe_current_period_end",
    };
  }

  if (profileEnd && start) {
    // Use profile renewal if it is within ~13 months of start (sanity).
    const delta = profileEnd.getTime() - start.getTime();
    if (delta > 0 && delta < 400 * 24 * 60 * 60 * 1000) {
      return {
        start,
        end: profileEnd,
        startSource,
        endSource: "profile_renewal_date",
      };
    }
  }

  if (start) {
    return {
      start,
      end: addOneCalendarYear(start),
      startSource,
      endSource: "one_calendar_year",
    };
  }

  if (profileEnd) {
    return {
      start: addOneCalendarYearInverse(profileEnd),
      end: profileEnd,
      startSource: "inferred_from_profile_renewal",
      endSource: "profile_renewal_date",
    };
  }

  return { start: null, end: null, startSource: null, endSource: null };
}

function addOneCalendarYearInverse(end) {
  const start = new Date(end.getTime());
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  return start;
}

/**
 * @param {Date | null} end
 * @param {Date} [now]
 */
export function isPeriodStillActive(end, now = new Date()) {
  const e = toDate(end);
  if (!e) return false;
  return e.getTime() > now.getTime();
}

/**
 * Complimentary migrated Pro entitlement is active.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {Date} [now]
 */
export function hasMigratedSupportProEntitlement(profile, now = new Date()) {
  if (!profile) return false;
  const source = String(profile.membershipSource ?? profile.membership_source ?? "")
    .trim()
    .toLowerCase();
  if (source !== SUPPORT_TO_PRO_MEMBERSHIP_SOURCE) return false;

  const tier = String(profile.membershipTier ?? profile.membership_tier ?? "")
    .trim()
    .toLowerCase();
  if (tier !== "member" && tier !== "pro") return false;

  const until =
    profile.migratedToProUntil ??
    profile.migrated_to_pro_until ??
    profile.renewalDate ??
    profile.renewal_date;
  return isPeriodStillActive(until, now);
}

/**
 * @param {string} migrationVersion
 * @param {string} workosUserId
 */
export function migrationEmailIdempotencyKey(migrationVersion, workosUserId) {
  return `support-pro-migration-email:${migrationVersion}:${workosUserId}`;
}

/**
 * Format expiration for user-facing email (UTC date).
 * @param {Date | string | null | undefined} value
 */
export function formatMigrationExpirationDate(value) {
  const d = toDate(value);
  if (!d) return "the end of your original membership period";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * @param {string} firstName
 * @param {string} expirationLabel
 */
export function buildSupportToProMigrationEmailHtml(firstName, expirationLabel) {
  const name = String(firstName || "").trim() || "there";
  const exp = String(expirationLabel || "").trim() || "the end of your original membership period";
  return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(name)},</p>
  <p>We have upgraded your Outreach Project Support Membership to a Pro Membership at no additional cost.</p>
  <p>Your account now includes full access to all Pro features through <strong>${escapeHtml(exp)}</strong>, which is the end of the one-year membership period you originally purchased.</p>
  <p>You will not be charged for this upgrade, and your previous Support Membership will not renew.</p>
  <p>Before your Pro access expires, we will send you information about continuing with a paid Pro Membership if you choose.</p>
  <p>You can <a href="https://theoutreachproject.app/sign-in">sign in now</a> to access your upgraded account.</p>
  <p>If anything looks incorrect, contact <a href="mailto:support@theoutreachproject.app">support@theoutreachproject.app</a>.</p>
  <p>Thank you for supporting the Outreach Project.<br/>The Outreach Project Team</p>
</body></html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const SUPPORT_TO_PRO_EMAIL_SUBJECT =
  "Your Outreach Project membership has been upgraded to Pro";
