import "./globals.css";
import Script from "next/script";
import ColorSchemeRoot from "@/components/app/ColorSchemeRoot";

const COLOR_SCHEME_BOOTSTRAP = `(function(){try{var d=document.documentElement,k='torp-color-scheme',s=localStorage.getItem(k);var v=(s==='dark'||s==='light')?s:'light';d.setAttribute('data-color-scheme',v);if(v==='dark')d.classList.add('dark');else d.classList.remove('dark');}catch(e){var d=document.documentElement;d.setAttribute('data-color-scheme','light');d.classList.remove('dark');}})();`;

export const metadata = {
  title: "The Outreach Project",
  description: "Veteran and first responder resource network",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="torp-color-scheme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_BOOTSTRAP }} />
        <ColorSchemeRoot>{children}</ColorSchemeRoot>
      </body>
    </html>
  );
}
