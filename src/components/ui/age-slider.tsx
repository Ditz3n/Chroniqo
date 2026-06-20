// src/components/ui/age-slider.tsx
"use client";

import * as React from "react";

interface AgeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function AgeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
}: AgeSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const computeValue = React.useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange(Math.round(min + pct * (max - min)));
    },
    [min, max, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    computeValue(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) computeValue(e.clientX);
  };

  const onPointerUp = () => {
    setIsDragging(false);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full px-4 select-none py-8">
      <div
        ref={trackRef}
        className="relative h-3 rounded-full cursor-pointer bg-surface-border"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Filled Track */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-brand pointer-events-none"
          style={{ width: `${percentage}%` }}
        />

        {/* Thumb */}
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-lg pointer-events-none ${
            isDragging ? "w-8 h-8" : "w-6 h-6 transition-all duration-200"
          }`}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
