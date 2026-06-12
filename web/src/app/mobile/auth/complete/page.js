import MobileAuthCompleteClient from "@/components/mobile/MobileAuthCompleteClient";

export const metadata = {
  title: "Sign in complete — The Outreach Project",
  robots: { index: false, follow: false },
};

/** Native WebView post-auth landing — session refresh then home or App Access paywall. */
export default function MobileAuthCompletePage() {
  return <MobileAuthCompleteClient />;
}
