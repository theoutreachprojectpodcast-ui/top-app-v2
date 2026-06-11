import WorkOSAuthHandoffClient from "@/components/auth/WorkOSAuthHandoffClient";

export default function SignUpPage() {
  return <WorkOSAuthHandoffClient mode="signup" backHref="/" />;
}
