// src/app/(components)/features-grid.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { Clock, Palette, ShieldCheck } from "lucide-react";

export function FeaturesGrid() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Clock className="w-10 h-10 text-brand" strokeWidth={1.75} />,
      title: t("featuresGrid.card_1_title"),
      desc: t("featuresGrid.card_1_desc"),
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-brand" strokeWidth={1.75} />,
      title: t("featuresGrid.card_2_title"),
      desc: t("featuresGrid.card_2_desc"),
    },
    {
      icon: <Palette className="w-10 h-10 text-brand" strokeWidth={1.75} />,
      title: t("featuresGrid.card_3_title"),
      desc: t("featuresGrid.card_3_desc"),
    },
  ];

  return (
    <section id="about" className="py-24 px-6 scroll-mt-[120px]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 font-heading text-foreground">
          {t("featuresGrid.title")}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl p-10 border bg-surface border-surface-border transition-all hover:-translate-y-1 duration-300"
            >
              <div className="mb-6">{feature.icon}</div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 font-heading text-foreground">
                {feature.title}
              </h3>
              <p className="text-base leading-relaxed font-sans text-foreground-60">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
