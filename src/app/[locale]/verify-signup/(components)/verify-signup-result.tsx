// src/app/[locale]/verify-signup/(components)/verify-signup-result.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  status: string;
  locale: string;
}

export function VerifySignupResult({ status, locale }: Props) {
  const { t } = useTranslation();

  const isSuccess = status === "success";
  const isExpired = status === "expired";

  const icon = isSuccess ? (
    <CheckCircle size={48} className="text-brand" />
  ) : isExpired ? (
    <Clock size={48} className="text-brand" />
  ) : (
    <XCircle size={48} className="text-brand" />
  );

  const title = isSuccess
    ? t("verifySignup.success_title")
    : isExpired
      ? t("verifySignup.expired_title")
      : t("verifySignup.invalid_title");

  const message = isSuccess
    ? t("verifySignup.success_message")
    : isExpired
      ? t("verifySignup.expired_message")
      : t("verifySignup.invalid_message");

  return (
    <div className="w-full max-w-[1040px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-surface-border animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center gap-5 text-center min-h-[260px]">
      {icon}

      <div className="flex flex-col gap-2 max-w-sm">
        <h1 className="text-2xl font-heading font-bold text-foreground">
          {title}
        </h1>
        <p className="text-sm text-foreground-60 leading-relaxed">{message}</p>
      </div>

      {isSuccess && (
        <Link
          href={`/${locale}/onboarding`}
          className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t("verifySignup.success_cta")}
        </Link>
      )}

      {!isSuccess && (
        <Link
          href={`/${locale}/onboarding`}
          className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-surface-border text-sm font-semibold hover:bg-surface-hover transition-colors"
        >
          {t("verifySignup.back_to_onboarding")}
        </Link>
      )}
    </div>
  );
}
