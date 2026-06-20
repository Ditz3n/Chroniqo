// src/app/[locale]/onboarding/(components)/steps/metrics-steps.tsx
"use client";

import { RulerPicker } from "@/components/ui/ruler-picker";
import { useTranslation } from "@/lib/hooks/use-translation";
import { startTransition } from "react";
import { StepProps } from "./types";

export function StepWeight({
  data,
  updateData,
  onFirstChange,
}: StepProps & { onFirstChange?: () => void }) {
  const { t } = useTranslation();
  const unit = data.weightUnit || "kg";
  const weight = data.weight || (unit === "kg" ? 70 : 150);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex bg-surface-border p-1 rounded-full w-max">
        <button
          type="button"
          onClick={() =>
            startTransition(() => updateData({ weightUnit: "kg" }))
          }
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
            unit === "kg"
              ? "bg-brand text-white shadow-md"
              : "text-foreground-60"
          }`}
        >
          {t("onboarding.unit_kg")}
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(() => updateData({ weightUnit: "lbs" }))
          }
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
            unit === "lbs"
              ? "bg-brand text-white shadow-md"
              : "text-foreground-60"
          }`}
        >
          {t("onboarding.unit_lbs")}
        </button>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="w-60 text-center text-7xl font-bold font-heading text-foreground bg-surface border-2 border-brand rounded-2xl px-4 py-2">
          {weight.toFixed(1)}
        </div>
        <span className="text-2xl font-semibold text-foreground-40">
          {unit}
        </span>
      </div>

      <div className="w-full max-w-lg lg:max-w-md">
        <RulerPicker
          min={unit === "kg" ? 30 : 60}
          max={unit === "kg" ? 200 : 400}
          value={weight}
          onChange={(w) => updateData({ weight: w })}
          onInteract={onFirstChange}
          orientation="horizontal"
        />
      </div>
    </div>
  );
}

export function StepHeight({
  data,
  updateData,
  onFirstChange,
}: StepProps & { onFirstChange?: () => void }) {
  const { t } = useTranslation();
  const unit = data.heightUnit || "cm";
  const height = data.height || (unit === "cm" ? 170 : 5.5);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex bg-surface-border p-1 rounded-full w-max">
        <button
          type="button"
          onClick={() =>
            startTransition(() => updateData({ heightUnit: "cm" }))
          }
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
            unit === "cm"
              ? "bg-brand text-white shadow-md"
              : "text-foreground-60"
          }`}
        >
          {t("onboarding.unit_cm")}
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(() => updateData({ heightUnit: "ft" }))
          }
          className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
            unit === "ft"
              ? "bg-brand text-white shadow-md"
              : "text-foreground-60"
          }`}
        >
          {t("onboarding.unit_ft")}
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-10 w-full justify-center max-w-sm sm:max-w-md">
        <div className="flex flex-col items-end gap-2">
          <div className="w-40 sm:w-60 text-center text-5xl sm:text-7xl font-bold font-heading text-foreground bg-surface border-2 border-brand rounded-2xl px-3 sm:px-4 py-2">
            {height.toFixed(1)}
          </div>
          <span className="text-base sm:text-xl font-semibold text-foreground-40">
            {unit}
          </span>
        </div>

        <div className="w-full max-w-lg px-4">
          <RulerPicker
            min={unit === "cm" ? 100 : 4.0}
            max={unit === "cm" ? 230 : 8.0}
            value={height}
            onChange={(h) => updateData({ height: h })}
            onInteract={onFirstChange}
            orientation="vertical"
            className="!h-[244px]"
          />
        </div>
      </div>
    </div>
  );
}
