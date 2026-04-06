"use client";

import IconWrap from "@/components/shared/IconWrap";
import { useColorScheme } from "@/components/app/ColorSchemeRoot";

const PATH_SUN =
  "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12m8-6h2M4 12H2m15.07 7.07 1.42 1.42M5.51 5.51 4.1 4.1m12.02 0 1.42-1.42M4.1 19.9l1.42-1.42M12 2v2m0 16v2";
const PATH_MOON = "M21 14.5A8.5 8.5 0 0 1 9.5 3 6.5 6.5 0 1 0 21 14.5z";

export default function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isLight = colorScheme === "light";

  return (
    <button
      type="button"
      className="btnSoft themeToggle"
      onClick={toggleColorScheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLight}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      <IconWrap path={isLight ? PATH_MOON : PATH_SUN} />
    </button>
  );
}
