import "./globals.css";
import { Roboto } from "next/font/google";
import ColorSchemeRoot from "@/components/app/ColorSchemeRoot";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import { ProfileDataProvider } from "@/features/profile/ProfileDataProvider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata = {
  title: "The Outreach Project",
  description: "Veteran and first responder resource network",
  manifest: "/manifest.webmanifest?v=4",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=4", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning data-color-scheme="light">
      <body suppressHydrationWarning>
        <ColorSchemeRoot>
          <AuthSessionProvider>
            <ProfileDataProvider>{children}</ProfileDataProvider>
          </AuthSessionProvider>
        </ColorSchemeRoot>
      </body>
    </html>
  );
}
