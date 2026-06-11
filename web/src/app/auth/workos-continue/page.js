import WorkOSExternalContinueClient from "@/components/auth/WorkOSExternalContinueClient";

/** Same-origin pause after PKCE cookie is set — then navigate to WorkOS (WebView + incognito safe). */
export default function WorkOSContinuePage() {
  return <WorkOSExternalContinueClient backHref="/mobile" />;
}
