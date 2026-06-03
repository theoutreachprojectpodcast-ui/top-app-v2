import { expectedWorkOSOrganizationId } from "@/lib/auth/workosOrganizationScope";

/**
 * Add a WorkOS user to the launch organization after self-service sign-up
 * (sign-up URLs must not pin organizationId or new users see "not authorized").
 */
export async function ensureWorkOSOrganizationMembership(userId) {
  const organizationId = expectedWorkOSOrganizationId();
  const apiKey = String(process.env.WORKOS_API_KEY || "").trim();
  const uid = String(userId || "").trim();
  if (!organizationId || !apiKey || !uid) {
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.workos.com/user_management/organization_memberships", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ organization_id: organizationId, user_id: uid }),
    });
    if (res.ok) return { ok: true, created: true };
    if (res.status === 409) return { ok: true, created: false };
    const body = await res.text().catch(() => "");
    console.warn("[torp] WorkOS org membership:", res.status, body.slice(0, 200));
    return { ok: false, status: res.status };
  } catch (e) {
    console.error("[torp] WorkOS org membership failed:", e);
    return { ok: false, error: e };
  }
}
