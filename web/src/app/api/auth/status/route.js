import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";

export async function GET() {
  const stripeReady = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_SUPPORT_MONTHLY &&
    process.env.STRIPE_PRICE_MEMBER_MONTHLY &&
    process.env.STRIPE_PRICE_SPONSOR_MONTHLY
  );
  return Response.json({
    workos: isWorkOSConfigured(),
    stripe: stripeReady,
    supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
