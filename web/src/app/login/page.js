import WorkOSAuthHandoffClient from "@/components/auth/WorkOSAuthHandoffClient";

/** Alias for WorkOS sign-in endpoint (`/login` per AuthKit quickstart). */
export default function LoginPage() {
  return <WorkOSAuthHandoffClient mode="signin" backHref="/" />;
}
