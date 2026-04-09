import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { stripeCheckoutConfigured, stripePublishableConfigured, stripeWebhookConfigured } from "@/lib/billing/stripeConfig";

export async function GET() {
  return Response.json({
    workos: isWorkOSConfigured(),
    stripe: stripeCheckoutConfigured(),
    stripePublishable: stripePublishableConfigured(),
    stripeWebhook: stripeWebhookConfigured(),
    supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
