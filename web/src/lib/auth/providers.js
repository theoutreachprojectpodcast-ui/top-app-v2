/**
 * Auth provider identifiers. Demo flow uses `demo_email`; map real Supabase/OAuth
 * providers to these (or extend) when replacing the demo layer.
 */
export const AUTH_PROVIDER = {
  DEMO_EMAIL: "demo_email",
  /** WorkOS AuthKit (email, Google, etc. via hosted UI) */
  WORKOS: "workos",
  /** Reserved for Supabase Auth email/password */
  EMAIL: "email",
  /** Reserved for OAuth (e.g. Google) */
  GOOGLE: "google",
};
