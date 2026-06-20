// src/app/[locale]/(protected)/legal/help/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HelpPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs = [
    {
      id: "getting-started",
      questionKey: "help.faq_1_q",
      answerKey: "help.faq_1_a",
    },
    {
      id: "daily-status",
      questionKey: "help.faq_2_q",
      answerKey: "help.faq_2_a",
    },
    {
      id: "communities",
      questionKey: "help.faq_3_q",
      answerKey: "help.faq_3_a",
    },
    { id: "anonymity", questionKey: "help.faq_4_q", answerKey: "help.faq_4_a" },
    { id: "messaging", questionKey: "help.faq_5_q", answerKey: "help.faq_5_a" },
    { id: "search", questionKey: "help.faq_6_q", answerKey: "help.faq_6_a" },
    { id: "feed", questionKey: "help.faq_7_q", answerKey: "help.faq_7_a" },
    { id: "profile", questionKey: "help.faq_8_q", answerKey: "help.faq_8_a" },
    {
      id: "ai-support",
      questionKey: "help.faq_9_q",
      answerKey: "help.faq_9_a",
    },
    { id: "privacy", questionKey: "help.faq_10_q", answerKey: "help.faq_10_a" },
    {
      id: "account-settings",
      questionKey: "help.faq_11_q",
      answerKey: "help.faq_11_a",
    },
    {
      id: "delete-account",
      questionKey: "help.faq_12_q",
      answerKey: "help.faq_12_a",
    },
    {
      id: "reporting",
      questionKey: "help.faq_13_q",
      answerKey: "help.faq_13_a",
    },
    {
      id: "accessibility",
      questionKey: "help.faq_14_q",
      answerKey: "help.faq_14_a",
    },
    {
      id: "technical-issues",
      questionKey: "help.faq_15_q",
      answerKey: "help.faq_15_a",
    },
  ];

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex w-full min-h-full pb-6 justify-center">
      <div className="flex flex-col w-full max-w-[1100px] px-4 sm:px-6">
        <main className="w-full max-w-3xl mx-auto py-6">
          <button
            onClick={() => router.push("/feed")}
            className="flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors w-fit py-2 rounded-full cursor-pointer mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("help.back_button")}
          </button>
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
                {t("help.title")}
              </h1>
              <p className="text-foreground-60 text-lg">{t("help.subtitle")}</p>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                  {t("help.faq_title")}
                </h2>
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="rounded-lg border border-surface-border bg-surface overflow-hidden transition-colors hover:border-surface-border/60"
                    >
                      <button
                        onClick={() => toggleExpanded(faq.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-foreground/2 transition-colors text-left"
                      >
                        <h3 className="font-semibold text-foreground">
                          {t(faq.questionKey)}
                        </h3>
                        <ChevronDown
                          className={`h-5 w-5 text-foreground-60 transition-transform ${
                            expandedId === faq.id ? "transform rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedId === faq.id && (
                        <div className="px-6 py-4 border-t border-surface-border bg-foreground/1">
                          <p className="text-foreground-60 leading-relaxed">
                            {t(faq.answerKey)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 p-6 rounded-lg bg-brand/5 border border-brand/20 space-y-4">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {t("help.still_need_help_title")}
                </h2>
                <p className="text-foreground-60">
                  {t("help.still_need_help_desc")}
                </p>
                <ul className="space-y-2 text-foreground-60">
                  <li className="flex gap-2">
                    <span className="text-brand">•</span>
                    <span>{t("help.help_item_1")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand">•</span>
                    <span>{t("help.help_item_2")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand">•</span>
                    <span>{t("help.help_item_3")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand">•</span>
                    <span>{t("help.help_item_4")}</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-lg bg-surface border border-surface-border space-y-4">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {t("help.remember_title")}
                </h2>
                <p className="text-foreground-60">{t("help.remember_desc")}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
