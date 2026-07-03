import "./globals.css";
import { Suspense } from "react";
import { Roboto } from "next/font/google";
import ColorSchemeRoot from "@/components/app/ColorSchemeRoot";
import CapacitorNativeShell from "@/components/capacitor/CapacitorNativeShell";
import MobileCapacitorSplashDismiss from "@/components/capacitor/MobileCapacitorSplashDismiss";
import CapacitorRemoteBootstrap from "@/components/capacitor/CapacitorRemoteBootstrap";
import MobileBootLoader from "@/components/capacitor/MobileBootLoader";
import MobileProductionHealthGate from "@/components/capacitor/MobileProductionHealthGate";
import MobileAccountReturnBridge from "@/components/capacitor/MobileAccountReturnBridge";
import MobileOAuthBrowserFinish from "@/components/capacitor/MobileOAuthBrowserFinish";
import MobileOAuthDeepLink from "@/components/capacitor/MobileOAuthDeepLink";
import MobileOAuthSessionResume from "@/components/capacitor/MobileOAuthSessionResume";
import MobileOAuthCallbackStallRecovery from "@/components/capacitor/MobileOAuthCallbackStallRecovery";
import MobileOAuthStaleFlagCleanup from "@/components/capacitor/MobileOAuthStaleFlagCleanup";
import MobileOAuthHandoffError from "@/components/capacitor/MobileOAuthHandoffError";
import MobileOAuthProgressOverlay from "@/components/capacitor/MobileOAuthProgressOverlay";
import ExternalBrowserSheetHost from "@/components/capacitor/ExternalBrowserSheetHost";
import MobileNativeGate from "@/components/mobile/MobileNativeGate";
import WebAppAccessGate from "@/components/membership/WebAppAccessGate";
import ProMembershipGate from "@/components/membership/ProMembershipGate";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import { ProfileDataProvider } from "@/features/profile/ProfileDataProvider";
import { ProfileEditProvider } from "@/features/profile/ProfileEditProvider";
import ScrollToTopOnNavigate from "@/components/navigation/ScrollToTopOnNavigate";

/** Mobile WebView + PWA safe areas (notches, home indicator). */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata = {
  title: "The Outreach Project",
  description: "Veteran and first responder resource network",
  applicationName: "The Outreach Project",
  manifest: "/manifest.webmanifest?v=5",
  appleWebApp: {
    capable: true,
    title: "TOP",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-precomposed.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "TOP",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning data-color-scheme="light">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.protocol,h=(location.hostname||"").toLowerCase();if(p==="capacitor:"||p==="ionic:"||p==="file:"||(p!=="http:"&&p!=="https:"&&(!h||h==="localhost"||h==="127.0.0.1"))){location.replace("https://theoutreachproject.app/");}}catch(e){}})();`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body {
  background-color: #121212;
  color: #e8eef6;
}
html[data-color-scheme="light"], html[data-color-scheme="light"] body {
  background-color: #e8ece8;
  color: #111714;
}
html[data-capacitor-native], html[data-capacitor-native] body {
  min-height: 100%;
  min-height: 100dvh;
  /* Top safe area lives on .appSiteHeader only — avoid double inset above the header row. */
  padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
            `.trim(),
          }}
        />
      </head>
      <body suppressHydrationWarning>
                <CapacitorRemoteBootstrap />
                <CapacitorNativeShell />
                <MobileCapacitorSplashDismiss />
        <ColorSchemeRoot>
          <AuthSessionProvider>
            <ProfileDataProvider>
              <ProfileEditProvider>
                <MobileBootLoader />
                <MobileOAuthProgressOverlay />
                <ExternalBrowserSheetHost />
                <MobileProductionHealthGate />
                <Suspense fallback={null}>
                  <ScrollToTopOnNavigate />
                  <MobileOAuthBrowserFinish />
                  <MobileOAuthDeepLink />
                  <MobileOAuthSessionResume />
                  <MobileOAuthCallbackStallRecovery />
                  <MobileOAuthStaleFlagCleanup />
                  <MobileOAuthHandoffError />
                  <MobileAccountReturnBridge />
                  <MobileNativeGate />
                </Suspense>
                <WebAppAccessGate />
                <ProMembershipGate />
                {children}
              </ProfileEditProvider>
            </ProfileDataProvider>
          </AuthSessionProvider>
        </ColorSchemeRoot>
      </body>
    </html>
  );
}
