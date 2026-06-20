// src/app/[locale]/(protected)/legal/about/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <div className="flex w-full min-h-full pb-6 justify-center">
      <div className="flex flex-col w-full max-w-[1100px] px-4 sm:px-6">
        <main className="w-full max-w-3xl mx-auto py-6">
          <button
            onClick={() => router.push("/feed")}
            className="flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors w-fit py-2 rounded-full cursor-pointer mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("about.back_button")}
          </button>
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
                {t("about.title")}
              </h1>
              <p className="text-foreground-60 text-lg">
                {t("about.subtitle")}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                  {t("about.mission_title")}
                </h2>
                <p className="text-foreground-60 leading-relaxed">
                  {t("about.mission_desc")}
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                  {t("about.built_title")}
                </h2>
                <p className="text-foreground-60 leading-relaxed">
                  {t("about.built_desc")}
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                  {t("about.core_values_title")}
                </h2>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-brand font-bold">✓</span>
                    <div>
                      <span className="font-semibold text-foreground">
                        {t("about.no_pressure_title")}
                      </span>
                      <p className="text-foreground-60 text-sm">
                        {t("about.no_pressure_desc")}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand font-bold">✓</span>
                    <div>
                      <span className="font-semibold text-foreground">
                        {t("about.privacy_title")}
                      </span>
                      <p className="text-foreground-60 text-sm">
                        {t("about.privacy_desc")}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand font-bold">✓</span>
                    <div>
                      <span className="font-semibold text-foreground">
                        {t("about.adaptive_title")}
                      </span>
                      <p className="text-foreground-60 text-sm">
                        {t("about.adaptive_desc")}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand font-bold">✓</span>
                    <div>
                      <span className="font-semibold text-foreground">
                        {t("about.community_title")}
                      </span>
                      <p className="text-foreground-60 text-sm">
                        {t("about.community_desc")}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                  {t("about.key_features_title")}
                </h2>
                <div className="grid gap-4">
                  <div className="p-4 rounded-lg bg-surface border border-surface-border">
                    <h3 className="font-semibold text-foreground mb-2">
                      {t("about.async_communities_title")}
                    </h3>
                    <p className="text-foreground-60 text-sm">
                      {t("about.async_communities_desc")}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface border border-surface-border">
                    <h3 className="font-semibold text-foreground mb-2">
                      {t("about.daily_status_title")}
                    </h3>
                    <p className="text-foreground-60 text-sm">
                      {t("about.daily_status_desc")}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface border border-surface-border">
                    <h3 className="font-semibold text-foreground mb-2">
                      {t("about.personal_messaging_title")}
                    </h3>
                    <p className="text-foreground-60 text-sm">
                      {t("about.personal_messaging_desc")}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface border border-surface-border">
                    <h3 className="font-semibold text-foreground mb-2">
                      {t("about.ai_bot_title")}
                    </h3>
                    <p className="text-foreground-60 text-sm">
                      {t("about.ai_bot_desc")}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                  {t("about.important_note_title")}
                </h2>
                <div className="p-4 rounded-lg bg-brand/5 border border-brand/20">
                  <p className="text-foreground-60 text-sm">
                    {t("about.important_note_desc")}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
                  {t("about.built_care_title")}
                </h2>
                <p className="text-foreground-60 leading-relaxed">
                  {t("about.built_care_desc")}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
