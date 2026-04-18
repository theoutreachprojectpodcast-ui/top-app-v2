"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const COLOR_SCHEME_STORAGE_KEY = "torp-color-scheme";

const ColorSchemeContext = createContext({
  colorScheme: "light",
  setColorScheme: () => {},
  toggleColorScheme: () => {},
});

export function useColorScheme() {
  return useContext(ColorSchemeContext);
}

function readDomScheme() {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  return document.documentElement.dataset.colorScheme === "dark" ? "dark" : "light";
}

export default function ColorSchemeRoot({ children }) {
  const [colorScheme, setColorSchemeState] = useState("light");

  useEffect(() => {
    setColorSchemeState(readDomScheme());
  }, []);

  const setColorScheme = useCallback((next) => {
    const v = next === "dark" ? "dark" : "light";
    setColorSchemeState(v);
    document.documentElement.dataset.colorScheme = v;
    document.documentElement.classList.toggle("dark", v === "dark");
    try {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, v);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme(colorScheme === "light" ? "dark" : "light");
  }, [colorScheme, setColorScheme]);

  const value = useMemo(
    () => ({ colorScheme, setColorScheme, toggleColorScheme }),
    [colorScheme, setColorScheme, toggleColorScheme]
  );

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}
