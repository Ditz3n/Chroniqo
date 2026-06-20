// src/app/[locale]/onboarding/(components)/steps/mood-steps.tsx
"use client";

import { DailyStatusSlider } from "@/app/(components)/daily-status-slider";
import { Smiley } from "@/app/(components)/smiley";
import { DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { StepProps } from "./types";

export function StepMood({
  data,
  updateData,
  onFirstChange,
}: StepProps & { onFirstChange?: () => void }) {
  const { t } = useTranslation();
  const statusValue = data.moodValue ?? 2; // Default to neutral
  const color = DAILY_STATUSES[statusValue]?.color || DAILY_STATUSES[2].color;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div
        className="w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center gap-6 transition-all duration-500 shadow-xl"
        style={{ background: color, boxShadow: `0 12px 40px ${color}40` }}
      >
        <div className="w-32 h-32">
          <Smiley statusValue={statusValue} />
        </div>
        <p className="text-lg font-medium font-sans text-white/90 transition-all duration-300">
          {t(DAILY_STATUSES[statusValue].labelKey)}
        </p>
        <div className="w-full">
          <DailyStatusSlider
            value={statusValue}
            onChange={(val) => {
              onFirstChange?.();
              updateData({ moodValue: val });
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function StepNote({ data, updateData }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="relative rounded-2xl translate-y-0 lg:translate-y-16 border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
        <textarea
          autoFocus
          rows={6}
          maxLength={250}
          value={data.moodNote || ""}
          onChange={(e) => updateData({ moodNote: e.target.value })}
          placeholder=" "
          className="peer w-full px-5 pb-3 rounded-2xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 resize-none text-lg appearance-none transition-all"
          style={{ paddingTop: "1rem" }}
        />
        <label
          className="absolute left-4 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
        peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
        >
          {t("onboarding.note_placeholder")}
        </label>
      </div>
      <div className="text-right translate-y-0 lg:translate-y-16 mt-2 text-sm text-foreground-40 font-medium">
        {(data.moodNote || "").length} / 250
      </div>
    </div>
  );
}
