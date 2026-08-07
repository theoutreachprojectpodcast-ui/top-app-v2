/**
 * Immutable bulk license audit events.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   organizationId?: string | null,
 *   licenseId?: string | null,
 *   eventType: string,
 *   actorUserId?: string | null,
 *   actorType?: 'system' | 'user' | 'admin' | 'stripe' | 'webhook',
 *   metadata?: Record<string, unknown>,
 * }} opts
 */
export async function recordBulkLicenseEvent(admin, opts) {
  const row = {
    organization_id: opts.organizationId || null,
    license_id: opts.licenseId || null,
    event_type: String(opts.eventType || "").trim() || "unknown",
    actor_user_id: opts.actorUserId || null,
    actor_type: opts.actorType || "system",
    metadata: opts.metadata || {},
  };
  const { error } = await admin.from("bulk_license_events").insert(row);
  if (error) {
    console.error("[bulk] license event write failed", error.message, { type: row.event_type });
  }
}
