// src/app/[locale]/(protected)/legal/privacy/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProtectedPrivacyPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex w-full min-h-full py-6 justify-center">
      <div className="flex flex-col w-full max-w-[1100px] px-4 sm:px-6">
        <main className="w-full max-w-3xl mx-auto pt-0 pb-6">
          <button
            onClick={() => router.push("/feed")}
            className="flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors w-fit py-2 rounded-full cursor-pointer mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("privacy.back_button")}
          </button>
          <h1 className="text-4xl font-bold font-heading text-foreground mb-4">
            {t("privacy.title")}
          </h1>
          <p className="text-sm font-semibold text-foreground-40 uppercase tracking-wider mb-12">
            {t("privacy.last_updated")}
          </p>

          <div className="flex flex-col gap-10">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <section key={num}>
                <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
                  {t(`privacy.h${num}`)}
                </h2>
                <p className="text-base leading-relaxed font-sans text-foreground-67">
                  {t(`privacy.p${num}`)}
                </p>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
