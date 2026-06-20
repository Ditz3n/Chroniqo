// src/app/(components)/hero-smiley.tsx
"use client";

import { DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { HeroSmileyProps } from "@/types/app-types";
import { useEffect, useState } from "react";
import { Smiley } from "./smiley";

export function HeroSmiley({
  lockedMood,
  externalCycleValue,
  externalFading,
}: HeroSmileyProps) {
  const { t } = useTranslation();
  const [cycleValue, setCycleValue] = useState(2);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isLocked = lockedMood !== null;

  // The displayed mood: locked value takes priority, then external, then internal cycle
  const displayValue = isLocked
    ? lockedMood
    : (externalCycleValue ?? cycleValue);
  const displayFading = externalFading ?? fading;
  const currentStatus = DAILY_STATUSES[displayValue];
  const color = currentStatus.color;

  const DOT_COUNT = 22;
  const RADIUS = 224;
  const CENTER = 260;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-cycle only runs while no mood is locked AND no external control is provided
  useEffect(() => {
    if (isLocked) return;
    if (externalCycleValue !== undefined) return;

    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCycleValue((prev) => (prev + 1) % DAILY_STATUSES.length);
        setFading(false);
      }, 350);
    }, 2200);

    return () => clearInterval(interval);
  }, [isLocked, externalCycleValue]);

  // Fade transition when the locked mood is first applied or changes
  useEffect(() => {
    if (!isLocked) return;

    const fadeIn = setTimeout(() => setFading(true), 0);
    const fadeOut = setTimeout(() => setFading(false), 350);
    return () => {
      clearTimeout(fadeIn);
      clearTimeout(fadeOut);
    };
  }, [lockedMood, isLocked]);

  return (
    <div
      className={`hero-smiley-box relative flex items-center justify-center ${mounted ? "animate-smiley-entrance" : "opacity-0"}`}
    >
      <svg className="hero-smiley-box absolute inset-0 animate-spin-slow">
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const angle = (i / DOT_COUNT) * 2 * Math.PI;
          const cx =
            Math.round((CENTER + RADIUS * Math.cos(angle)) * 1e4) / 1e4;
          const cy =
            Math.round((CENTER + RADIUS * Math.sin(angle)) * 1e4) / 1e4;
          const isLarge = i % 4 === 0;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={isLarge ? 5 : 3.5}
              fill={color}
              opacity={isLarge ? 0.75 : 0.38}
              className="transition-colors duration-700 ease-in-out"
            />
          );
        })}
      </svg>

      {/* Radial glow */}
      <div
        className="absolute rounded-full transition-colors duration-700 w-[360px] h-[360px]"
        style={{
          background: `radial-gradient(circle, ${color}28 0%, transparent 72%)`,
        }}
      />

      <div
        className={`transition-all duration-300 ease-in-out ${displayFading ? "opacity-0 scale-90" : "opacity-100 scale-100"}`}
      >
        <Smiley statusValue={displayValue} />
      </div>

      {/* Label */}
      <div
        className={`hero-smiley-label absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-semibold text-white whitespace-nowrap font-sans transition-all duration-300 ${displayFading ? "opacity-0" : "opacity-100"}`}
        style={{ background: color }}
      >
        {t(currentStatus.labelKey)}
      </div>
    </div>
  );
}
