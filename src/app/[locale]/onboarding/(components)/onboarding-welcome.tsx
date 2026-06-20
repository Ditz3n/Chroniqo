// src/app/[locale]/onboarding/(components)/onboarding-welcome.tsx
"use client";

import { Smiley } from "@/app/(components)/smiley";
import { useTranslation } from "@/lib/hooks/use-translation";

interface OnboardingWelcomeProps {
  username: string;
}

export function OnboardingWelcome({ username }: OnboardingWelcomeProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background animate-in fade-in duration-700">
      <div className="w-full max-w-[1040px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] border border-surface-border overflow-hidden lg:h-[500px]">
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
          <div className="w-48 h-48">
            <Smiley
              statusValue={4}
              color="var(--color-dailystatus-full-energy)"
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-3xl sm:text-4xl font-heading text-foreground text-center">
              {t("onboarding.welcome_title").replace("{{username}}", username)}
            </h1>
            <p className="text-sm text-foreground-60 font-medium">
              {t("onboarding.welcome_subtitle")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
