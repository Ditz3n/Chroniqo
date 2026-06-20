// src/app/(components)/theme-toggle.tsx
"use client";

import { useTheme } from "@/lib/hooks/use-theme";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mount Guard: setState inside effect is intentional here - server and client is needed
  // to both start as false so hydration matches, then flip to true after hydration completes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const [iconSwap, setIconSwap] = useState(false);

  // Cycle through themes in the order: system -> light -> dark -> system
  const handleToggle = () => {
    setIconSwap(true);
    setTimeout(() => {
      if (theme === "system") setTheme("light");
      else if (theme === "light") setTheme("dark");
      else setTheme("system");
      setIconSwap(false);
    }, 200);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label="Toggle theme"
      className="w-10 h-10 flex items-center justify-center rounded-full border border-lang-border text-foreground transition-all cursor-pointer"
    >
      <span
        className={`transition-all duration-300 inline-flex ${iconSwap ? "scale-0" : "scale-100"} ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        {/* Always render a placeholder on SSR; swap to the real icon only after client mount to avoid hydration mismatch */}
        {!mounted && <Monitor size={18} />}
        {mounted && theme === "light" && <Sun size={18} />}
        {mounted && theme === "dark" && <Moon size={18} />}
        {mounted && theme === "system" && <Monitor size={18} />}
      </span>
    </button>
  );
}
