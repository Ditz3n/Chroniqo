// src/app/[locale]/confirm-username/(components)/confirm-username-form.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { Smiley } from "@/app/(components)/smiley";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ConfirmUsernameFormProps, ValidationState } from "@/types/app-types";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UsernameInput } from "./username-input";

const SESSION_KEY = "confirm_username_token";

export function ConfirmUsernameForm({
  token: tokenProp,
  locale,
}: ConfirmUsernameFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { update: updateSession, data: session } = useSession();

  const [currentUsername, setCurrentUsername] = useState("");

  const [token] = useState<string>(() => {
    if (tokenProp) return tokenProp;
    try {
      return sessionStorage.getItem(SESSION_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const [state, setState] = useState<ValidationState>(
    token ? "loading" : "invalid",
  );
  const [newUsername, setNewUsername] = useState("");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    try {
      sessionStorage.setItem(SESSION_KEY, token);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (state === "success" || state === "invalid" || state === "expired") {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
    }
  }, [state]);

  useEffect(() => {
    if (!token) return;

    const validate = async () => {
      try {
        console.log("[Confirm Username] Validating token");
        const res = await fetch(
          `/api/user/confirm-username?token=${encodeURIComponent(token)}`,
        );
        const json = await res.json();
        console.log("[Confirm Username] Validation result:", json);
        if (json.valid) {
          setCurrentUsername(json.currentUsername ?? "");
          setState("valid");
        } else {
          setState(json.reason === "expired" ? "expired" : "invalid");
        }
      } catch (err) {
        console.error("[Confirm Username] Validation failed:", err);
        setState("invalid");
      }
    };

    validate();
  }, [token]);

  const usernameValid = /^[a-z0-9_-]{3,30}$/.test(newUsername);
  const usernamesMatch = newUsername === confirmUsername;
  const notSameAsCurrent = newUsername !== currentUsername;
  const canConfirm =
    usernameValid && usernamesMatch && notSameAsCurrent && !isConfirming;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsConfirming(true);
    setConfirmError(null);

    try {
      console.log("[Confirm Username] Confirming username change");
      const res = await fetch("/api/user/confirm-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newUsername }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error === "username_taken") {
          setConfirmError(t("confirmUsername.username_taken_error"));
        } else if (json.error === "same_username") {
          setConfirmError(t("confirmUsername.username_same_error"));
        } else {
          setConfirmError(t("confirmUsername.confirm_error"));
        }
        setIsConfirming(false);
        return;
      }

      console.log("[Confirm Username] Username changed to:", json.newUsername);

      // Update session if logged in - no-op if not
      if (session) {
        await updateSession({ username: json.newUsername });
      }

      setState("exiting");
      setTimeout(() => setState("success"), 350);

      setTimeout(() => {
        router.push(`/${locale}/u/${json.newUsername}/settings`);
        router.refresh();
      }, 3500 + 350);
    } catch (err) {
      console.error("[Confirm Username] Confirmation failed:", err);
      setConfirmError(t("confirmUsername.confirm_error"));
      setIsConfirming(false);
    }
  };

  const isExiting = state === "exiting";

  return (
    <div className="relative overflow-hidden w-full max-w-[1040px] lg:h-[460px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 animate-smiley-entrance flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 border border-surface-border">
      {state === "success" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24">
            <Smiley
              statusValue={4}
              color="var(--color-dailystatus-full-energy)"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-foreground">
              {t("confirmUsername.success_title")}
            </p>
            <p className="text-sm text-foreground-60 leading-relaxed max-w-xs">
              {t("confirmUsername.success_subtitle", {
                username: `@${newUsername}`,
              })}
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
                {t("confirmUsername.title")}
              </h1>
              <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
                {t("confirmUsername.subtitle")}
              </p>
            </div>
          </div>

          {/* Right Pane */}
          <div className="lg:flex-[1.2] flex flex-col h-full w-full">
            {state === "loading" && (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand animate-spin" />
              </div>
            )}

            {(state === "invalid" || state === "expired") && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center animate-in fade-in duration-300">
                <div className="w-24 h-24">
                  <Smiley statusValue={0} color="var(--brand)" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-foreground">
                    {state === "expired"
                      ? t("confirmUsername.token_expired")
                      : t("confirmUsername.token_invalid")}
                  </p>
                  <p className="text-sm text-foreground-60">
                    {t("confirmUsername.token_hint")}
                  </p>
                </div>
                <Link
                  href={
                    session?.user?.username
                      ? `/${locale}/u/${session.user.username}/settings`
                      : `/${locale}/feed`
                  }
                  className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors"
                >
                  {t("confirmUsername.back_to_settings")}
                </Link>
              </div>
            )}

            {(state === "valid" || state === "exiting") && (
              <div className="flex flex-1 flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col flex-1 justify-center gap-4">
                  {/* Current Username - disabled reference */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                      {t("confirmUsername.current_username_label")}
                    </label>
                    <div className="flex items-center gap-2 px-4 py-3 bg-background border border-surface-border rounded-xl opacity-50 cursor-not-allowed">
                      <span className="text-sm font-medium text-foreground-40 select-none shrink-0">
                        u/
                      </span>
                      <span className="text-sm text-foreground">
                        {currentUsername}
                      </span>
                    </div>
                  </div>

                  {/* New Username Input */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="new-username"
                      className="text-xs font-semibold text-foreground-40 uppercase tracking-wider"
                    >
                      {t("confirmUsername.new_username_label")}
                    </label>
                    <UsernameInput
                      id="new-username"
                      value={newUsername}
                      onChange={(v) => {
                        setNewUsername(v);
                        setConfirmError(null);
                      }}
                      indicator={
                        newUsername.length >= 3
                          ? usernameValid && notSameAsCurrent
                            ? "valid"
                            : "invalid"
                          : "none"
                      }
                    />
                  </div>

                  {/* Confirm New Username Input */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="confirm-username"
                      className="text-xs font-semibold text-foreground-40 uppercase tracking-wider"
                    >
                      {t("confirmUsername.confirm_username_label")}
                    </label>
                    <UsernameInput
                      id="confirm-username"
                      value={confirmUsername}
                      onChange={(v) => {
                        setConfirmUsername(v);
                        setConfirmError(null);
                      }}
                      indicator={
                        confirmUsername.length >= 3
                          ? usernamesMatch
                            ? "valid"
                            : "invalid"
                          : "none"
                      }
                    />
                  </div>

                  {/* Reserved Validation Block - always occupies space to prevent layout shift */}
                  <div className="min-h-[20px]">
                    {newUsername.length >= 3 && !usernameValid && (
                      <p className="text-xs font-medium text-feedback-error">
                        {t("confirmUsername.username_format_error")}
                      </p>
                    )}
                    {newUsername.length >= 3 &&
                      usernameValid &&
                      !notSameAsCurrent && (
                        <p className="text-xs font-medium text-feedback-error">
                          {t("confirmUsername.username_same_error")}
                        </p>
                      )}
                    {confirmUsername.length >= 3 && !usernamesMatch && (
                      <p className="text-xs font-medium text-feedback-error">
                        {t("confirmUsername.username_mismatch")}
                      </p>
                    )}
                    {confirmError && (
                      <p className="text-xs font-medium text-feedback-error">
                        {confirmError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-8 lg:mt-auto pt-4 flex flex-row items-center justify-between w-full gap-2">
                  <Link
                    href={`/${locale}/feed`}
                    className="text-sm font-semibold text-foreground-60 hover:text-foreground hover:bg-foreground/5 px-3 py-2 rounded-full transition-colors -ml-3"
                  >
                    {t("confirmUsername.cancel")}
                  </Link>
                  <Button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0 cursor-pointer"
                  >
                    {isConfirming
                      ? t("auth.loading_dots")
                      : t("confirmUsername.confirm_btn")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
