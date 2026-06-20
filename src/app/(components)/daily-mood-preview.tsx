// src/app/(components)/daily-mood-preview.tsx
"use client";

import { DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { applyBrandColor } from "@/lib/utils/branding";
import { DailyMoodPreviewProps } from "@/types/app-types";
import { useEffect, useState } from "react";
import { DailyStatusSlider } from "./daily-status-slider";
import { Smiley } from "./smiley";

export function DailyMoodPreview({ onMoodSelect }: DailyMoodPreviewProps) {
  const { t } = useTranslation();
  const [statusValue, setStatusValue] = useState(2);
  const color = DAILY_STATUSES[statusValue]?.color || DAILY_STATUSES[2].color;

  useEffect(() => {
    return () => applyBrandColor(null);
  }, []);

  const handleChange = (value: number) => {
    setStatusValue(value);
    applyBrandColor(value);
    onMoodSelect(value);
  };

  return (
    <section id="features" className="relative py-32 px-6 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${color}28 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <p
          className="text-center text-base font-semibold uppercase tracking-widest mb-4 font-sans"
          style={{ color }}
        >
          {t("previewSection.tag")}
        </p>

        <h2 className="text-4xl md:text-5xl font-bold text-center mb-20 font-heading text-foreground">
          {t("previewSection.title")}
        </h2>

        <div
          className="mx-auto max-w-md rounded-[2.5rem] p-10 flex flex-col items-center gap-8 transition-all duration-500"
          style={{ background: color, boxShadow: `0 12px 60px ${color}55` }}
        >
          <p className="text-xl font-semibold text-center w-full font-heading text-white/95">
            {t("dailyStatus.question")}
          </p>

          <div className="w-32 h-32">
            <Smiley statusValue={statusValue} />
          </div>

          <p className="text-lg font-medium font-sans text-white/85 transition-all duration-300">
            {t(DAILY_STATUSES[statusValue].labelKey)}
          </p>

          <div className="w-full mt-2 mb-2">
            <DailyStatusSlider value={statusValue} onChange={handleChange} />
          </div>

          <button
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all hover:opacity-90 active:scale-95 font-sans bg-white/95 cursor-pointer"
            style={{ color }}
          >
            {t("dailyStatus.submit")}
          </button>
        </div>

        <p className="text-center mt-10 text-base font-sans text-foreground-67">
          {t("previewSection.caption")}
        </p>
      </div>
    </section>
  );
}
