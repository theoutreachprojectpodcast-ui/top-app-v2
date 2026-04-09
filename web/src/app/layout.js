import "./globals.css";
import ColorSchemeRoot from "@/components/app/ColorSchemeRoot";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";

export const metadata = {
  title: "The Outreach Project",
  description: "Veteran and first responder resource network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-color-scheme="light">
      <body suppressHydrationWarning>
        <ColorSchemeRoot>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </ColorSchemeRoot>
      </body>
    </html>
  );
}
