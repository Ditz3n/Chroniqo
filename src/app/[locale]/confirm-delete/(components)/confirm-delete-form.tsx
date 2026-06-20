// src/app/[locale]/confirm-delete/(components)/confirm-delete-form.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import { Smiley } from "@/app/(components)/smiley";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ConfirmDeleteFormProps, ValidationState } from "@/types/app-types";
import { AlertTriangle, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const SESSION_KEY = "confirm_delete_token";

export function ConfirmDeleteForm({
  token: tokenProp,
  locale,
}: ConfirmDeleteFormProps) {
  const { t } = useTranslation();

  // Resolve token from prop first, then sessionStorage fallback.
  // This survives locale switches, which cause a redirect that drops query params.
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
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const CONFIRM_PHRASE = t("confirmDelete.confirm_phrase");

  // Persist token to sessionStorage so it survives locale-switch redirects
  useEffect(() => {
    if (!token) return;
    try {
      sessionStorage.setItem(SESSION_KEY, token);
    } catch {
      // sessionStorage unavailable - proceed without persistence
    }
  }, [token]);

  // Clear the stored token once the flow is complete
  useEffect(() => {
    if (state === "success" || state === "invalid" || state === "expired") {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
    }
  }, [state]);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    const validate = async () => {
      try {
        console.log("[ConfirmDeleteForm] Validating deletion token");
        const res = await fetch(
          `/api/user/delete-request?token=${encodeURIComponent(token)}`,
        );
        const json = await res.json();

        console.log("[ConfirmDeleteForm] Token validation result:", json);

        if (json.valid) {
          setState("valid");
        } else {
          setState(json.reason === "expired" ? "expired" : "invalid");
        }
      } catch (err) {
        console.error("[ConfirmDeleteForm] Token validation failed:", err);
        setState("invalid");
      }
    };

    validate();
  }, [token]);

  const handleDelete = async () => {
    if (confirmInput !== CONFIRM_PHRASE || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      console.log("[ConfirmDeleteForm] Sending DELETE /api/user");
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) throw new Error("Delete request failed");

      console.log("[ConfirmDeleteForm] Account deleted - fading out");
      // Fade out the two-pane content first, then swap to success
      setState("exiting");
      setTimeout(() => setState("success"), 350);

      // Delay sign-out to allow the success screen to render
      setTimeout(async () => {
        await signOut({ callbackUrl: `/${locale}` });
      }, 3500 + 350);
    } catch (err) {
      console.error("[ConfirmDeleteForm] Deletion failed:", err);
      setDeleteError(t("confirmDelete.delete_error"));
      setIsDeleting(false);
    }
  };

  const isConfirmValid = confirmInput === CONFIRM_PHRASE;
  const isExiting = state === "exiting";

  return (
    <div className="relative overflow-hidden w-full max-w-[1040px] lg:h-[420px] bg-surface rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 animate-smiley-entrance flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-16 border border-surface-border">
      {state === "success" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24">
            <Smiley statusValue={0} color="var(--brand)" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-foreground">
              {t("confirmDelete.success_title")}
            </p>
            <p className="text-sm text-foreground-60 leading-relaxed max-w-xs">
              {t("confirmDelete.success_subtitle")}
            </p>
          </div>
        </div>
      ) : (
        // Two-pane layout - fades out as a unit when exiting
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
                {t("confirmDelete.title")}
              </h1>
              <p className="text-base text-foreground-67 max-w-sm leading-relaxed">
                {t("confirmDelete.subtitle")}
              </p>
            </div>
          </div>

          {/* Right Pane */}
          <div className="lg:flex-[1.2] flex flex-col h-full w-full">
            {/* Loading State */}
            {state === "loading" && (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand animate-spin" />
              </div>
            )}

            {/* Invalid / Expired State - Smiley statusValue=0 (exhausted/red) */}
            {(state === "invalid" || state === "expired") && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center animate-in fade-in duration-300">
                <div className="w-24 h-24">
                  <Smiley statusValue={0} color="var(--brand)" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-foreground">
                    {state === "expired"
                      ? t("confirmDelete.token_expired")
                      : t("confirmDelete.token_invalid")}
                  </p>
                  <p className="text-sm text-foreground-60">
                    {t("confirmDelete.token_hint")}
                  </p>
                </div>
                <Link
                  href={`/${locale}/feed`}
                  className="text-sm font-semibold text-brand hover:bg-brand/10 px-3 py-2 rounded-full transition-colors"
                >
                  {t("confirmDelete.back_to_feed")}
                </Link>
              </div>
            )}

            {/* Valid State - Confirmation Form */}
            {(state === "valid" || state === "exiting") && (
              <div className="flex flex-1 flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col flex-1 justify-center gap-5">
                  {/* Warning */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-brand/10 border border-brand/20">
                    <AlertTriangle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-brand/90 leading-relaxed">
                      {t("confirmDelete.warning")}
                    </p>
                  </div>

                  {/* Confirmation Input */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="confirm-input"
                      className="text-sm text-foreground-60"
                    >
                      {t("confirmDelete.input_label")}{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {CONFIRM_PHRASE}
                      </span>
                    </label>
                    <div
                      className={
                        "flex items-center px-4 py-3 bg-background border rounded-xl transition-all focus-within:ring-2 " +
                        (isConfirmValid
                          ? "border-brand/50 focus-within:border-brand focus-within:ring-brand/30"
                          : "border-surface-border focus-within:border-brand focus-within:ring-brand")
                      }
                    >
                      <input
                        id="confirm-input"
                        type="text"
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder={CONFIRM_PHRASE}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="flex-1 bg-transparent text-foreground text-sm focus:outline-none appearance-none min-w-0 placeholder:text-foreground-40"
                      />
                    </div>
                    {deleteError && (
                      <p className="text-xs font-medium text-feedback-error px-1">
                        {deleteError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Row - mirrors login page button row layout */}
                <div className="mt-8 lg:mt-auto pt-4 flex flex-row items-center justify-between w-full gap-2">
                  <Link
                    href={`/${locale}/feed`}
                    className="text-sm font-semibold text-foreground-60 hover:text-foreground hover:bg-foreground/5 px-3 py-2 rounded-full transition-colors -ml-3"
                  >
                    {t("confirmDelete.cancel")}
                  </Link>
                  <Button
                    onClick={handleDelete}
                    disabled={!isConfirmValid || isDeleting}
                    className="px-6 py-2.5 rounded-full text-sm h-[42px] shrink-0 cursor-pointer"
                  >
                    {isDeleting
                      ? t("auth.loading_dots")
                      : t("confirmDelete.confirm_btn")}
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
