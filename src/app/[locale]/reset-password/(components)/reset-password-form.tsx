// src/app/[locale]/reset-password/(components)/reset-password-form.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { Smiley } from "@/app/(components)/smiley";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ResetPasswordForm({ token }: { token?: string }) {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<
    "idle" | "exiting" | "success"
  >("idle");

  const [tokenState, setTokenState] = useState<
    "loading" | "valid" | "invalid" | "expired"
  >(token ? "loading" : "invalid");

  useEffect(() => {
    if (!token) return;
    const validate = async () => {
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        );
        const json = await res.json();
        if (json.valid) {
          setTokenState("valid");
        } else {
          setTokenState(json.reason === "expired" ? "expired" : "invalid");
        }
      } catch {
        setTokenState("invalid");
      }
    };
    validate();
  }, [token]);

  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    setError(null);
    setIsLoading(true);

    try {
      console.log("[ResetPasswordForm] Attempting to reset password");

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("resetPassword.invalid_token"));
      }

      setSuccessState("exiting");

      // Give user time to read the success message before redirecting
      setTimeout(() => setSuccessState("success"), 350);
      setTimeout(() => {
        router.push(`/${locale}/login`);
        router.refresh();
      }, 3500 + 350);
    } catch (err: unknown) {
      console.error("[ResetPasswordForm] Error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (successState === "success") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24">
          <Smiley
            statusValue={4}
            color="var(--color-dailystatus-full-energy)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-foreground">
            {t("resetPassword.success_title")}
          </p>
          <p className="text-sm text-foreground-60 leading-relaxed max-w-xs">
            {t("resetPassword.success_subtitle")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 flex-1 min-w-0"
      style={{
        opacity: successState === "exiting" ? 0 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Left Pane */}
      <div className="lg:flex-1 flex flex-col items-start shrink-0">
        <Link
          href={`/${locale}`}
          className="mb-6 lg:mb-8 block hover:opacity-80 transition-opacity shrink-0"
        >
          <ChroniqoLogo width={48} height={48} className="text-foreground" />
        </Link>
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          <h1 className="text-4xl font-heading text-foreground mb-4">
            {t("resetPassword.reset_title")}
          </h1>
          <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
            {t("resetPassword.reset_subtitle")}
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

            {tokenState === "loading" && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand animate-spin" />
              </div>
            )}

            {(tokenState === "invalid" || tokenState === "expired") && (
              <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-300">
                <div className="w-24 h-24">
                  <Smiley statusValue={0} color="var(--brand)" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-foreground">
                    {tokenState === "expired"
                      ? t("resetPassword.token_expired")
                      : t("resetPassword.invalid_token")}
                  </p>
                  <p className="text-sm text-foreground-60">
                    {t("resetPassword.token_hint")}
                  </p>
                </div>
              </div>
            )}

            {tokenState === "valid" && (
              <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    minLength={8}
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
            peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                  >
                    {t("resetPassword.new_password_label")}
                  </label>
                </div>

                <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 appearance-none transition-all"
                  />
                  <label
                    htmlFor="confirm-password"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
            peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                  >
                    {t("auth.confirm_password_label")}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-password"
                    checked={showPassword}
                    onCheckedChange={(c) => setShowPassword(c as boolean)}
                  />
                  <label
                    htmlFor="show-password"
                    className="text-sm font-medium text-foreground-60 cursor-pointer select-none"
                  >
                    {t("auth.show_password")}
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

            {tokenState === "valid" && (
              <Button
                type="submit"
                disabled={isLoading || !passwordsMatch}
                className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0"
              >
                {isLoading
                  ? t("resetPassword.updating")
                  : t("resetPassword.update_password")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
