import MobileWorkOSAuthLauncher from "@/components/mobile/MobileWorkOSAuthLauncher";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";

export const metadata = {
  title: "Create account — The Outreach Project",
};

/** Legacy path — client launcher opens WorkOS in the native in-app browser (Turnstile-safe). */
export default async function MobileSignUpLauncherPage({ searchParams }) {
  const params = await searchParams;
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "/mobile/access";
  const goPath = workosGoUrl({
    mode: "signup",
    returnTo,
    rememberDevice: params?.remember !== "0",
    loginHint: typeof params?.loginHint === "string" ? params.loginHint : undefined,
  });

  return <MobileWorkOSAuthLauncher goPath={goPath} label="Opening create account…" />;
}
