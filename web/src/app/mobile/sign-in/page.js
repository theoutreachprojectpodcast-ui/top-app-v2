import MobileWorkOSAuthLauncher from "@/components/mobile/MobileWorkOSAuthLauncher";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";

export const metadata = {
  title: "Sign in — The Outreach Project",
};

/** Legacy path — client launcher navigates the WebView to WorkOS (no Capacitor Browser sheet). */
export default async function MobileSignInLauncherPage({ searchParams }) {
  const params = await searchParams;
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "/mobile/auth/complete";
  const goPath = workosGoUrl({
    mode: "signin",
    returnTo,
    rememberDevice: params?.remember !== "0",
    loginHint: typeof params?.loginHint === "string" ? params.loginHint : undefined,
    native: true,
  });

  return <MobileWorkOSAuthLauncher goPath={goPath} label="Opening sign in…" />;
}
