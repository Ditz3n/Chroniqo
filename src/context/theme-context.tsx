// src/context/theme-context.tsx
"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to system to prevent mismatches on first render
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme-preference") as Theme) ?? "system";
  });

  // Applies the theme to the DOM
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark");

    if (newTheme === "system") {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (systemDark) root.classList.add("dark");
    } else if (newTheme === "dark") {
      root.classList.add("dark");
    }
  }, []);

  // Updates both React state, localStorage, and the DOM
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem("theme-preference", newTheme);
      applyTheme(newTheme);
    },
    [applyTheme],
  );

  // Re-sync the DOM class with React state after hydration. The inline script sets the
  // correct class before first paint, but React can overwrite it during hydration.
  // intentionally runs once on mount only, theme changes are handled by setTheme
  // This is why ESLint rule is disabled for exhaustive-deps here.
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize with external system theme changes if set to "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
