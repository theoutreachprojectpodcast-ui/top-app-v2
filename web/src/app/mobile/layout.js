import "@/styles/mobile-splash-page.css";

export default function MobileLayout({ children }) {
  return (
    <div className="mobileRouteShell" data-mobile-route="1">
      {children}
    </div>
  );
}
