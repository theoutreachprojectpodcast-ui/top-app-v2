import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { getBulkPackageCatalog } from "@/lib/bulkLicensing/packageCatalog";
import { deploymentProfile } from "@/lib/runtime/appUrls";

/**
 * Admin/QA diagnostics for bulk licensing (no secret keys).
 */
export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const catalog = await getBulkPackageCatalog();
  const env = deploymentProfile();

  const [{ data: recentOrgs }, { data: recentWebhooks }, { data: recentBatches }] = await Promise.all([
    ctx.admin
      .from("bulk_organizations")
      .select("id, name, business_code, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    ctx.admin
      .from("bulk_stripe_webhook_events")
      .select("stripe_event_id, event_type, processing_status, error_summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    ctx.admin
      .from("bulk_license_batches")
      .select("id, organization_id, package_size, generated_count, status, term_start, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return Response.json({
    environment: env,
    stripeMode: catalog.stripeMode,
    checkoutConfigured: catalog.checkoutConfigured,
    webhookConfigured: catalog.webhookConfigured,
    missingEnvKeys: catalog.missingEnvKeys,
    packages: catalog.packages.map((p) => ({
      size: p.size,
      priceId: p.priceId,
      priceIdConfigured: p.priceIdConfigured,
      displayPrice: p.displayPrice,
      interval: p.interval,
    })),
    recentOrganizations: recentOrgs || [],
    recentWebhooks: recentWebhooks || [],
    recentBatches: recentBatches || [],
    links: {
      store: "/bulk-licenses",
      store25: "/bulk-licenses?package=25",
      store50: "/bulk-licenses?package=50",
      store100: "/bulk-licenses?package=100",
      store200: "/bulk-licenses?package=200",
      admin: "/admin/bulk-licensing",
      redeem: "/redeem",
    },
  });
}
