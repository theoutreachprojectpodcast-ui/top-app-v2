import WorkOSAuthHandoffClient from "@/components/auth/WorkOSAuthHandoffClient";

export default function AuthSignInPage() {
  return <WorkOSAuthHandoffClient mode="signin" backHref="/" />;
}
