// src/app/(components)/footer.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="rounded-t-[3rem] px-8 py-16 mt-12 bg-surface border-t border-surface-border">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-10">
        <span className="text-3xl font-bold font-heading text-foreground">
          {t("footerSection.logo_prefix")}
          <span className="text-brand">{t("footerSection.logo_accent")}</span>
          {t("footerSection.logo_suffix")}
        </span>

        <p className="text-base text-center max-w-sm font-sans text-foreground-67">
          {t("footerSection.description")}
        </p>

        <div className="text-center text-sm leading-relaxed font-sans text-foreground-40">
          <p>{t("footerSection.credit_1")}</p>
          <p>{t("footerSection.credit_2")}</p>
          <p>{t("footerSection.credit_3")}</p>
          <a
            href="https://kursuskatalog.au.dk/da/course/138256/SW7BAC-01-Bachelorprojekt"
            className="underline hover:opacity-80 transition-opacity text-foreground-40"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("footerSection.credit_link")}
          </a>
        </div>
      </div>
    </footer>
  );
}
