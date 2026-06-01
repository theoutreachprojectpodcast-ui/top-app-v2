import { enforceSameOrigin, rateLimit } from "@/lib/security/requestGuards";

const MAX_JSON_BYTES = 512 * 1024;

/**
 * @param {Request} request
 * @param {{
 *   rateKey: string,
 *   limit?: number,
 *   windowMs?: number,
 *   skipOriginCheck?: boolean,
 * }} options
 */
export function guardMutation(request, options) {
  const { rateKey, limit = 40, windowMs = 60000, skipOriginCheck = false } = options;
  if (!skipOriginCheck) {
    const origin = enforceSameOrigin(request);
    if (!origin.ok) return origin;
  }
  return rateLimit(request, rateKey, { limit, windowMs });
}

/**
 * @param {{ status?: number, error?: string, retryAfterMs?: number }} guard
 */
export function guardFailureResponse(guard) {
  const headers = {};
  if (guard.retryAfterMs) {
    headers["Retry-After"] = String(Math.ceil(guard.retryAfterMs / 1000));
  }
  return Response.json(
    { ok: false, error: guard.error || "forbidden" },
    { status: guard.status || 403, headers },
  );
}

/**
 * @param {Request} request
 * @param {import("zod").ZodTypeAny} schema
 */
export async function parseJsonBody(request, schema) {
  const raw = await request.text();
  if (raw.length > MAX_JSON_BYTES) {
    return { ok: false, status: 413, error: "payload_too_large" };
  }
  if (!raw.trim()) {
    return { ok: false, status: 400, error: "empty_body" };
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "validation_failed",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * @param {{ status?: number, error?: string, issues?: unknown }} result
 */
export function validationFailureResponse(result) {
  return Response.json(
    { ok: false, error: result.error || "validation_failed", issues: result.issues || [] },
    { status: result.status || 400 },
  );
}
