// src/lib/utils/branding.ts
import { DAILY_STATUSES } from "@/lib/constants";

const DEFAULT_BRAND_COLOR = "#E65C69";
const STORAGE_KEY = "chroniqo-mood";

export function applyBrandColor(value: number | null): void {
  if (typeof document === "undefined") return;

  const color =
    value !== null && value >= 0 && value <= 4
      ? DAILY_STATUSES[value].color
      : DEFAULT_BRAND_COLOR;

  document.documentElement.style.setProperty("--brand", color);

  // Persist alongside today's date so tomorrow's load doesn't bleed yesterday's color
  try {
    if (value !== null) {
      const today = new Date().toLocaleDateString("en-CA");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, date: today }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) - silent fail
  }
}
