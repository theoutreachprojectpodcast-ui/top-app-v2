import MobileAuthCompleteClient from "@/components/mobile/MobileAuthCompleteClient";

/** Capacitor post-OAuth — client hard-navigates to `/?oauth=1` (server redirect stalls in WKWebView). */
export default function MobileAuthCompletePage() {
  return <MobileAuthCompleteClient />;
}
