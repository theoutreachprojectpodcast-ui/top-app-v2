import MobileWorkOSAuthLauncher from "@/components/mobile/MobileWorkOSAuthLauncher";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";

export const metadata = {
  title: "Sign in — The Outreach Project",
};

/** Native auth entry — launches WorkOS in the Capacitor WebView. */
export default async function MobileAuthStartPage({ searchParams }) {
  const params = await searchParams;
  const mode = params?.mode === "signup" ? "signup" : "signin";
  const returnTo =
    typeof params?.returnTo === "string" ? params.returnTo : MOBILE_POST_LOGIN_PATH;
  const goPath = workosGoUrl({
    mode,
    returnTo,
    rememberDevice: params?.remember !== "0",
    loginHint: typeof params?.loginHint === "string" ? params.loginHint : undefined,
    native: true,
  });

  return (
    <MobileWorkOSAuthLauncher
      goPath={goPath}
      label={mode === "signup" ? "Opening create account…" : "Opening sign in…"}
    />
  );
}
