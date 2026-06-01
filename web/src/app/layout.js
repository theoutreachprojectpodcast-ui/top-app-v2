import "./globals.css";
import { Roboto } from "next/font/google";
import ColorSchemeRoot from "@/components/app/ColorSchemeRoot";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import { ProfileDataProvider } from "@/features/profile/ProfileDataProvider";
import { ProfileEditProvider } from "@/features/profile/ProfileEditProvider";

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
        <ColorSchemeRoot>
          <AuthSessionProvider>
            <ProfileDataProvider>
              <ProfileEditProvider>{children}</ProfileEditProvider>
            </ProfileDataProvider>
          </AuthSessionProvider>
        </ColorSchemeRoot>
      </body>
    </html>
  );
}
