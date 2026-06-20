// src/app/(components)/daily-status-slider.tsx
"use client";

import { DAILY_STATUSES } from "@/lib/constants";
import { useCallback, useRef } from "react";

interface DailyStatusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function DailyStatusSlider({ value, onChange }: DailyStatusSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Compute the step based on pointer position
  const computeStep = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange(Math.round(pct * 4));
    },
    [onChange],
  );

  // Pointer event handlers
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    computeStep(e.clientX);
  };

  // Handle pointer move only if dragging
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) computeStep(e.clientX);
  };

  // End dragging on pointer up
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div className="w-full px-2 select-none">
      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer bg-white/30"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full pointer-events-none transition-all duration-300 bg-white/70"
          style={{ width: `${(value / 4) * 100}%` }}
        />

        {/* Step dots */}
        {DAILY_STATUSES.map((_, i) => {
          const active = i === value;
          return (
            <div
              key={i}
              className={`slider-dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${active ? "active" : ""}`}
              style={{ left: `${(i / 4) * 100}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onChange(i);
              }}
            />
          );
        })}

        {/* Thumb */}
        <div
          className="slider-thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white z-10 pointer-events-none transition-all duration-300"
          style={{ left: `${(value / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}
