import WorkOSAuthHandoffClient from "@/components/auth/WorkOSAuthHandoffClient";

export default function AuthSignUpPage() {
  return <WorkOSAuthHandoffClient mode="signup" backHref="/" />;
}
