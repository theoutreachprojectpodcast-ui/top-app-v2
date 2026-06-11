import "./globals.css";
import { Suspense } from "react";
import { Roboto } from "next/font/google";
import ColorSchemeRoot from "@/components/app/ColorSchemeRoot";
import CapacitorNativeShell from "@/components/capacitor/CapacitorNativeShell";
import MobileAccountReturnBridge from "@/components/capacitor/MobileAccountReturnBridge";
import MobileOAuthBrowserFinish from "@/components/capacitor/MobileOAuthBrowserFinish";
import MobileOAuthDeepLink from "@/components/capacitor/MobileOAuthDeepLink";
import MobileOAuthSessionResume from "@/components/capacitor/MobileOAuthSessionResume";
import MobileNativeGate from "@/components/mobile/MobileNativeGate";
import WebAppAccessGate from "@/components/membership/WebAppAccessGate";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import { ProfileDataProvider } from "@/features/profile/ProfileDataProvider";
import { ProfileEditProvider } from "@/features/profile/ProfileEditProvider";

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
      <body suppressHydrationWarning>
        <CapacitorNativeShell />
        <ColorSchemeRoot>
          <AuthSessionProvider>
            <ProfileDataProvider>
              <ProfileEditProvider>
                <Suspense fallback={null}>
                  <MobileOAuthBrowserFinish />
                  <MobileOAuthDeepLink />
                  <MobileOAuthSessionResume />
                  <MobileAccountReturnBridge />
                  <MobileNativeGate />
                </Suspense>
                <WebAppAccessGate />
                {children}
              </ProfileEditProvider>
            </ProfileDataProvider>
          </AuthSessionProvider>
        </ColorSchemeRoot>
      </body>
    </html>
  );
}
