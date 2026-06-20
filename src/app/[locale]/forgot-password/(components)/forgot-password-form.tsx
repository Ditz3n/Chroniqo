// src/app/[locale]/forgot-password/(components)/forgot-password-form.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/use-translation";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setSuccess(false);

    try {
      console.log("[ForgotPasswordForm] Requesting reset for:", email);

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (
          res.status === 400 &&
          data.error === "dummy_account_blocked_reset"
        ) {
          throw new Error(t("auth.dummy_account_blocked_reset"));
        }
        throw new Error("Failed to request password reset");
      }

      setSuccess(true);
    } catch (err) {
      console.error("[ForgotPasswordForm] Error:", err);
      setError(err instanceof Error ? err.message : t("auth.unexpected_error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Left Pane */}
      <div className="lg:flex-1 flex flex-col items-start shrink-0">
        <Link
          href={`/${locale}`}
          className="mb-6 lg:mb-8 block hover:opacity-80 transition-opacity shrink-0"
        >
          <ChroniqoLogo width={48} height={48} className="text-foreground" />
        </Link>
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          <h1 className="text-2xl sm:text-3xl font-heading text-foreground mb-4">
            {t("resetPassword.forgot_title")}
          </h1>
          <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
            {t("resetPassword.forgot_subtitle")}
          </p>
        </div>
      </div>

      {/* Right Pane */}
      <div className="lg:flex-[1.2] flex flex-col h-full w-full relative">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full h-full flex-1"
        >
          <div className="flex-1 flex flex-col justify-center">
            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl mb-4">
                {error}
              </div>
            )}

            {success ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 p-4 rounded-xl border-2 border-brand text-center">
                <p className="text-sm font-medium text-foreground">
                  {t("resetPassword.check_email")}
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                      peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                  >
                    {t("auth.email_label")}
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 lg:mt-auto pt-4 flex flex-row items-center justify-between w-full gap-2">
            <Link
              href={`/${locale}/login`}
              className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors -ml-3"
            >
              {t("resetPassword.back_to_login")}
            </Link>

            <Button
              type="submit"
              disabled={isLoading || success}
              className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0"
            >
              {isLoading
                ? t("resetPassword.sending")
                : t("resetPassword.send_link")}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
