// src/app/[locale]/verify-email/(components)/verify-email-result.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { Smiley } from "@/app/(components)/smiley";
import { useTranslation } from "@/lib/hooks/use-translation";
import { VerifyEmailResultProps } from "@/types/app-types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function VerifyEmailResult({ status, locale }: VerifyEmailResultProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();

  const isSuccess = status === "success";
  const isExpired = status === "expired";

  // Fade-out then swap to full-card success - same pattern as confirm-username
  const [display, setDisplay] = useState<"two-pane" | "exiting" | "success">(
    isSuccess ? "exiting" : "two-pane",
  );

  useEffect(() => {
    if (!isSuccess) return;
    // Brief delay so the page renders before starting the fade
    const fadeTimer = setTimeout(() => setDisplay("success"), 350);
    return () => clearTimeout(fadeTimer);
  }, [isSuccess]);

  useEffect(() => {
    if (display !== "success") return;
    const redirectTimer = setTimeout(() => {
      if (session?.user) {
        router.push(`/${locale}/feed`);
      } else {
        router.push(`/${locale}`);
      }
      router.refresh();
    }, 3500);
    return () => clearTimeout(redirectTimer);
  }, [display, session, locale, router]);

  const isExiting = display === "exiting";

  return (
    <div className="relative overflow-hidden w-full max-w-[1040px] lg:h-[420px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 animate-smiley-entrance flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 border border-surface-border">
      {display === "success" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24">
            <Smiley
              statusValue={4}
              color="var(--color-dailystatus-full-energy)"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-foreground">
              {t("verifyEmail.success_title")}
            </p>
            <p className="text-sm text-foreground-60 leading-relaxed max-w-xs">
              {t("verifyEmail.success_subtitle")}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 flex-1 min-w-0"
          style={{
            opacity: isExiting ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          {/* Left Pane */}
          <div className="lg:flex-1 flex flex-col items-start shrink-0">
            <Link
              href={`/${locale}`}
              className="mb-6 lg:mb-8 block hover:opacity-80 transition-opacity shrink-0"
            >
              <ChroniqoLogo
                width={48}
                height={48}
                className="text-foreground"
              />
            </Link>
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <h1 className="text-4xl font-heading text-foreground mb-4">
                {t("verifyEmail.title")}
              </h1>
              <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
                {t("verifyEmail.subtitle")}
              </p>
            </div>
          </div>

          {/* Right Pane - error states only (success fades out immediately) */}
          <div className="lg:flex-[1.2] flex flex-col h-full w-full">
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center animate-in fade-in duration-300">
              <div className="w-24 h-24">
                <Smiley statusValue={0} color="var(--brand)" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold text-foreground">
                  {isExpired
                    ? t("verifyEmail.token_expired")
                    : t("verifyEmail.token_invalid")}
                </p>
                <p className="text-sm text-foreground-60">
                  {t("verifyEmail.token_hint")}
                </p>
              </div>
              <Link
                href={session?.user ? `/${locale}/feed` : `/${locale}`}
                className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors"
              >
                {session?.user
                  ? t("verifyEmail.back_to_feed")
                  : t("verifyEmail.back_to_home")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
