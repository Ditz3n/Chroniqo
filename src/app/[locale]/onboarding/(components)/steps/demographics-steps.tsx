// src/app/[locale]/onboarding/(components)/steps/demographics-steps.tsx
"use client";

import { AgeSlider } from "@/components/ui/age-slider";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Mars, Venus } from "lucide-react";
import { StepProps } from "./types";

export function StepGender({ data, updateData }: StepProps) {
  const { t } = useTranslation();

  const getButtonClass = (gender: string) => {
    const isSelected = data.gender === gender;
    return `relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all cursor-pointer flex-1 ${
      isSelected
        ? "border-brand bg-brand/5 scale-[1.02]"
        : "border-surface-border bg-surface hover:bg-foreground/5 hover:border-foreground/20"
    }`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full justify-center">
      <button
        type="button"
        onClick={() => updateData({ gender: "male" })}
        className={getButtonClass("male")}
      >
        <span className="absolute top-4 left-4 font-semibold text-sm">
          {t("onboarding.gender_male")}
        </span>
        <span className="absolute bottom-4 right-4 opacity-60">
          <Mars size={28} />
        </span>
        <svg viewBox="0 0 100 100" className="w-22 h-22 mt-4">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="var(--smiley-face)"
            stroke="var(--smiley-feature)"
            strokeWidth="2"
            strokeOpacity="0.25"
          />

          <path
            d="M 2 38 Q 0 0 85 -10 Q 98 40 100 36 Q 18 13 45 17 Q 22 25 2.5 42"
            fill="var(--smiley-feature)"
          />
          <circle cx="34" cy="50" r="4" fill="var(--smiley-feature)" />
          <circle cx="66" cy="50" r="4" fill="var(--smiley-feature)" />
          <path
            d="M 40 70 Q 50 75 60 70"
            fill="none"
            stroke="var(--smiley-feature)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => updateData({ gender: "female" })}
        className={getButtonClass("female")}
      >
        <span className="absolute top-4 left-4 font-semibold text-sm">
          {t("onboarding.gender_female")}
        </span>
        <span className="absolute bottom-4 right-4 opacity-60">
          <Venus size={28} />
        </span>
        <svg viewBox="0 0 128 100" className="w-28 h-24 mt-4">
          {/* Ponytail strand */}
          <path
            d="M 50 24 Q 135 20 98 42 Q 120 68 56 54"
            fill="var(--smiley-feature)"
            stroke="var(--smiley-feature)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Hair tie */}
          <ellipse
            cx="82"
            cy="27"
            rx="6"
            ry="5"
            fill="var(--smiley-feature)"
            opacity="0.6"
          />
          {/* Face */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="var(--smiley-face)"
            stroke="var(--smiley-feature)"
            strokeWidth="2"
            strokeOpacity="0.25"
          />

          {/* Hair on top */}
          <path
            d="M 4 32 Q 32 -22 82 12 Q 88 20 100 28 Q 26 54 40 8 Q 72 18 0 42"
            fill="var(--smiley-feature)"
          />
          {/* Eyes & mouth - identical to male */}
          <circle cx="34" cy="50" r="4" fill="var(--smiley-feature)" />
          <circle cx="66" cy="50" r="4" fill="var(--smiley-feature)" />
          <path
            d="M 40 70 Q 50 75 60 70"
            fill="none"
            stroke="var(--smiley-feature)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function StepAge({
  data,
  updateData,
  onFirstChange,
}: StepProps & { onFirstChange?: () => void }) {
  const currentAge = data.age ?? 18;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="w-32 h-32 flex items-center justify-center rounded-[2.5rem] border-2 border-surface-border bg-surface">
        <span className="text-6xl font-bold font-heading text-foreground">
          {currentAge}
        </span>
      </div>
      <AgeSlider
        min={13}
        max={99}
        value={currentAge}
        onChange={(age) => {
          onFirstChange?.();
          updateData({ age });
        }}
      />
    </div>
  );
}
