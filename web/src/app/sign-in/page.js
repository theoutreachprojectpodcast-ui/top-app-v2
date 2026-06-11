import WorkOSAuthHandoffClient from "@/components/auth/WorkOSAuthHandoffClient";

/** WorkOS Redirects → Sign-in endpoint (https://theoutreachproject.app/sign-in). */
export default function SignInPage() {
  return <WorkOSAuthHandoffClient mode="signin" backHref="/" />;
}
