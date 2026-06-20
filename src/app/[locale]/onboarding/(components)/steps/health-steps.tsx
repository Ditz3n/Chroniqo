// src/app/[locale]/onboarding/(components)/steps/health-steps.tsx
"use client";

import { TagInput } from "@/components/ui/tag-input";
import {
  CONDITION_SUGGESTION_KEYS,
  MEDICATION_SUGGESTION_KEYS,
} from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Pill } from "lucide-react";
import { StepProps } from "./types";

export function StepIllnesses({ data, updateData }: StepProps) {
  const { t } = useTranslation();

  const suggestions = CONDITION_SUGGESTION_KEYS.map((key) => t(key));

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 lg:relative lg:min-h-[320px]">
      <div className="relative z-10">
        <TagInput
          tags={data.conditions || []}
          onChange={(conditions) => updateData({ conditions })}
          placeholder={t("onboarding.illness_search")}
          suggestions={suggestions}
        />
      </div>

      <div className="hidden lg:flex absolute top-30 left-0 right-0 items-center justify-center opacity-40 pointer-events-none z-0">
        <svg viewBox="0 0 100 100" className="w-48 h-48">
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
            d="M 30 63 Q 50 43 70 63"
            fill="none"
            stroke="var(--smiley-feature)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="35" cy="45" r="4" fill="var(--smiley-feature)" />
          <circle cx="65" cy="45" r="4" fill="var(--smiley-feature)" />
        </svg>
      </div>
    </div>
  );
}

export function StepMedications({ data, updateData }: StepProps) {
  const { t } = useTranslation();

  const suggestions = MEDICATION_SUGGESTION_KEYS.map((key) => t(key));

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 lg:relative lg:min-h-[320px]">
      <div className="relative z-10">
        <TagInput
          tags={data.medications || []}
          onChange={(medications) => updateData({ medications })}
          placeholder={t("onboarding.medications_search")}
          suggestions={suggestions}
        />
      </div>

      <div className="hidden lg:flex absolute top-30 left-0 right-0 items-center justify-center opacity-40 pointer-events-none z-0">
        <Pill size={192} strokeWidth={1} />
      </div>
    </div>
  );
}
