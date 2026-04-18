import "./globals.css";

export const metadata = {
  title: "The Outreach Project",
  description: "Veteran and first responder resource network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
