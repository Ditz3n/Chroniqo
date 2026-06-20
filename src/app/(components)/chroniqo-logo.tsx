// src/app/(components)/chroniqo-logo.tsx
import { ChroniqoLogoProps } from "@/types/app-types";

/**
 * Inline SVG logo that responds to both theme and mood without static files.
 *
 * C-letter: stroke="currentColor" - inherits from the parent's text color,
 * so wrapping with text-foreground makes it theme-aware automatically.
 *
 * EKG wave: stroke="var(--brand)" - reads directly from the CSS variable,
 * so it reacts to applyBrandColor() calls without any React re-render.
 */
export function ChroniqoLogo({
  width = 44,
  height = 44,
  className = "",
}: ChroniqoLogoProps) {
  return (
    <svg
      viewBox="2 -5 110 100"
      width={width}
      height={height}
      aria-label="Chroniqo logo"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 50 15 C 20 15, 10 40, 25 75 L 45 75 C 35 50, 40 35, 50 35 C 60 35, 65 50, 55 75"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 56 76 L 67 55 L 80 80 L 100 40"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="10"
        strokeLinejoin="bevel"
        strokeLinecap="round"
        className="logo-wave"
      />
    </svg>
  );
}
