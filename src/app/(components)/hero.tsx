// src/app/(components)/hero.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useSmoothScroll } from "@/lib/hooks/use-smooth-scroll";
import { useTranslation } from "@/lib/hooks/use-translation";
import { HeroProps } from "@/types/app-types";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { HeroSmiley } from "./hero-smiley";

export function Hero({ lockedMood }: HeroProps) {
  const { t, locale } = useTranslation();
  const { handleSmoothScroll } = useSmoothScroll();

  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Effect to trigger entrance animation
  useEffect(() => {
    const els = [
      line1Ref.current,
      line2Ref.current,
      subRef.current,
      ctaRef.current,
    ];
    els.forEach((el, i) => {
      if (!el) return;
      setTimeout(
        () => {
          el.classList.add("visible");
        },
        200 + i * 160,
      );
    });
  }, []);

  return (
    <section className="relative w-full flex items-center min-h-[100dvh] pt-44 md:pt-48 lg:pt-[100px] overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto px-8 md:px-16 flex flex-col lg:flex-row items-center gap-16 lg:gap-0">
        <div className="flex-1 flex flex-col justify-center items-center lg:items-start lg:pr-12 z-10 text-center lg:text-left">
          <h1 className="leading-none tracking-tight mb-8">
            <span
              ref={line1Ref}
              className="hero-fade block text-2xl md:text-3xl font-medium mb-2 font-sans text-foreground-60"
            >
              {t("heroSection.line_1")}
            </span>
            <span
              ref={line2Ref}
              className="hero-fade block font-extrabold font-heading text-[clamp(2.5rem,5vw,5rem)] leading-[1.05] text-foreground"
            >
              <span className="block">{t("heroSection.line_2_part_1")}</span>
              <span className="block text-brand transition-colors duration-500 whitespace-nowrap">
                {t("heroSection.line_2_part_2")}
              </span>
            </span>
          </h1>

          <p
            ref={subRef}
            className="hero-fade text-lg md:text-xl max-w-xl mb-12 leading-relaxed font-sans text-foreground-60"
          >
            {t("heroSection.subtitle")}
          </p>

          <div
            ref={ctaRef}
            className="hero-fade flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <Link href={`/${locale}/signup`}>
              <Button variant="primary">{t("heroSection.cta_primary")}</Button>
            </Link>
            <Link
              href={`/${locale}#features`}
              onClick={(e) => handleSmoothScroll(e, `/${locale}#features`)}
            >
              <Button variant="outline">
                {t("heroSection.cta_secondary")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center lg:justify-end w-full">
          <div className="scale-[0.75] sm:scale-[0.90] lg:scale-100 origin-center">
            <HeroSmiley lockedMood={lockedMood} />
          </div>
        </div>
      </div>
    </section>
  );
}
