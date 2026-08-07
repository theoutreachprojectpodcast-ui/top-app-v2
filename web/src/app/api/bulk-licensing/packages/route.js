import { getBulkPackageCatalog } from "@/lib/bulkLicensing/packageCatalog";

/** Public: package cards + config readiness (Price IDs are not secret). */
export async function GET() {
  const catalog = await getBulkPackageCatalog();
  return Response.json(catalog, {
    headers: { "Cache-Control": "no-store" },
  });
}
