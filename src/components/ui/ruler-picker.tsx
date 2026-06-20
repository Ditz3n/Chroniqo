// src/components/ui/ruler-picker.tsx
"use client";

import * as React from "react";

interface RulerPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  onInteract?: () => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

const RulerTicks = React.memo(function RulerTicks({
  units,
  max,
  isHorizontal,
}: {
  units: number[];
  max: number;
  isHorizontal: boolean;
}) {
  return (
    <>
      {/* Ruler Ticks */}
      {units.map((unit) => (
        <div
          key={unit}
          className={`shrink-0 flex relative ${
            isHorizontal
              ? "w-[80px] h-12 flex-row justify-start items-end"
              : "h-[80px] w-42 flex-col justify-start items-start"
          }`}
        >
          {/* Main Integer Tick */}
          <div
            className={`absolute bg-foreground/60 ${
              isHorizontal
                ? "w-0.5 h-6 bottom-0 left-0"
                : "h-0.5 w-6 right-0 top-0"
            }`}
          />

          {/* Integer Label */}
          <span
            className={`absolute text-sm font-semibold text-foreground/60 ${
              isHorizontal
                ? "bottom-8 left-0 -translate-x-1/2"
                : "right-8 top-0 -translate-y-1/2"
            }`}
          >
            {unit}
          </span>

          {/* Minor Ticks (0.1 to 0.9) */}
          {unit < max &&
            Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`absolute bg-foreground/20 ${
                  isHorizontal ? "w-px h-3 bottom-0" : "h-px w-3 right-0"
                }`}
                style={
                  isHorizontal
                    ? { left: `${(i + 1) * 10}%` }
                    : { top: `${(i + 1) * 10}%` }
                }
              />
            ))}
        </div>
      ))}
    </>
  );
});

export function RulerPicker({
  min,
  max,
  value,
  onChange,
  onInteract,
  orientation = "horizontal",
  className,
}: RulerPickerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const initializedRef = React.useRef(false);
  const interactedRef = React.useRef(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHorizontal = orientation === "horizontal";
  const unitSize = 80;

  const [halfSize, setHalfSize] = React.useState(200);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 8 : -8;
      if (isHorizontal) el.scrollLeft -= delta;
      else el.scrollTop += delta;
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [isHorizontal]);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const update = () =>
      setHalfSize(isHorizontal ? el.clientWidth / 2 : el.clientHeight / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isHorizontal]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Only fire onInteract once on the first real user scroll
    if (initializedRef.current && !interactedRef.current) {
      interactedRef.current = true;
      onInteract?.();
    }

    const target = e.currentTarget;
    const scrollAmount = isHorizontal ? target.scrollLeft : target.scrollTop;
    const rawValue = min + scrollAmount / unitSize;
    let rounded = Math.round(rawValue * 10) / 10;
    if (rounded < min) rounded = min;
    if (rounded > max) rounded = max;

    // Debounce the parent onChange to avoid re-render storms during fast scrolling.
    // The ruler position itself is driven by native scroll so it stays smooth.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      React.startTransition(() => onChange(rounded));
    }, 100);
  };

  // Scroll to initial value on mount
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const targetScroll = (value - min) * unitSize;
    if (isHorizontal) scrollRef.current.scrollLeft = targetScroll;
    else scrollRef.current.scrollTop = targetScroll;
    setTimeout(() => {
      initializedRef.current = true;
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!scrollRef.current || !initializedRef.current) return;
    const targetScroll = (value - min) * unitSize;
    if (isHorizontal) scrollRef.current.scrollLeft = targetScroll;
    else scrollRef.current.scrollTop = targetScroll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  // Clean up debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const units = React.useMemo(() => {
    const arr = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }, [min, max]);

  return (
    <div
      className={`relative w-full h-[80px] sm:h-[100px] flex items-center justify-center overflow-hidden bg-surface rounded-3xl border border-surface-border ${className ?? ""}`}
    >
      {/* Center Target Indicator */}
      <div
        className={`absolute z-10 pointer-events-none bg-brand rounded-full ${
          isHorizontal
            ? "w-1 h-16 left-1/2 -translate-x-1/2"
            : "h-1 w-20 top-1/2 -translate-y-1/2 translate-x-1/2"
        }`}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`no-scrollbar flex ${
          isHorizontal
            ? "flex-row overflow-x-auto w-full h-full items-end"
            : "flex-col overflow-y-auto h-full w-full items-start"
        }`}
        style={{ overscrollBehavior: "none" }}
      >
        {/* Start Spacer */}
        <div
          className="shrink-0"
          style={isHorizontal ? { width: halfSize } : { height: halfSize }}
        />

        {/* Ruler Ticks */}
        <RulerTicks units={units} max={max} isHorizontal={isHorizontal} />

        {/* End Spacer */}
        <div
          className="shrink-0"
          style={isHorizontal ? { width: halfSize - 79 } : { height: 42 }}
        />
      </div>
    </div>
  );
}
