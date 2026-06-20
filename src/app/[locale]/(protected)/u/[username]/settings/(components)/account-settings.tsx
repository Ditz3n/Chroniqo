// src/app/[locale]/(protected)/u/[username]/settings/(components)/account-settings.tsx
"use client";

import { Button } from "@/components/ui/button";
import { USERNAME_COOLDOWN_DAYS } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import {
  PasswordResetState,
  ResendState,
  UsernameRequestState,
  UserProfile,
} from "@/types/app-types";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useExpiryCountdown } from "../(hooks)/use-expiry-countdown";
import { DeleteAccountSection } from "./delete-account-section";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AccountSettings({ profile }: { profile: UserProfile }) {
  const { t, locale } = useTranslation();

  // --- Security data (email verification + resend cooldown) ---
  const { data: security, mutate: mutateSecurity } = useSWR<{
    emailVerified: boolean;
    resendCooldown: boolean;
    resendCooldownExpiresAt: string | null;
    passwordResetPending: boolean;
    passwordResetExpiresAt: string | null;
  }>("/api/users/settings/security", fetcher, { revalidateOnFocus: false });

  const { data: usernameCheckData } = useSWR<{
    pendingToken: { expiresAt: string } | null;
  }>("/api/user/username-change-request", fetcher, {
    revalidateOnFocus: false,
  });

  const usernameInitRef = useRef(false);

  useEffect(() => {
    if (!usernameCheckData || usernameInitRef.current) return;
    usernameInitRef.current = true;
    if (usernameCheckData.pendingToken) {
      const expires = new Date(usernameCheckData.pendingToken.expiresAt);
      setPendingExpiresAt(expires);
      setUsernameRequestState("pending");
    }
  }, [usernameCheckData]);

  // --- Email Verification Resend ---
  const [isResending, setIsResending] = useState(false);
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendExpiresAt, setResendExpiresAt] = useState<Date | null>(null);
  const [resendTimeLeft] = useExpiryCountdown(resendExpiresAt, () => {
    setResendExpiresAt(null);
    mutateSecurity();
  });
  const [passwordResetExpiresAt, setPasswordResetExpiresAt] =
    useState<Date | null>(null);
  const [passwordResetTimeLeft] = useExpiryCountdown(
    passwordResetExpiresAt,
    () => {
      setPasswordResetExpiresAt(null);
      mutateSecurity();
    },
  );
  const expiryInitializedRef = useRef(false);

  const isResendOnCooldown =
    security?.resendCooldown === true ||
    resendState === "cooldown" ||
    resendState === "sent";

  // --- Username Change (Token-Based) ---
  const [usernameRequestState, setUsernameRequestState] =
    useState<UsernameRequestState>("idle");
  const [pendingExpiresAt, setPendingExpiresAt] = useState<Date | null>(null);
  const [usernameTimeLeft] = useExpiryCountdown(pendingExpiresAt, () => {
    setPendingExpiresAt(null);
    setUsernameRequestState("idle");
  });
  const [isRequestingUsername, setIsRequestingUsername] = useState(false);
  const [usernameRequestError, setUsernameRequestError] = useState<
    string | null
  >(null);

  // --- Password Reset Trigger ---
  const [passwordResetState, setPasswordResetState] =
    useState<PasswordResetState>("idle");

  const isPasswordResetPending =
    security?.passwordResetPending === true || passwordResetState === "sent";

  // Initialize expiry times from SWR data once per mount
  useEffect(() => {
    if (!security || expiryInitializedRef.current) return;
    expiryInitializedRef.current = true;
    if (security.resendCooldownExpiresAt)
      setResendExpiresAt(new Date(security.resendCooldownExpiresAt));
    if (security.passwordResetExpiresAt)
      setPasswordResetExpiresAt(new Date(security.passwordResetExpiresAt));
  }, [security]);

  const cooldownUntil = profile.usernameChangedAt
    ? new Date(
        new Date(profile.usernameChangedAt).getTime() +
          USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
      )
    : null;
  const isInCooldown = cooldownUntil ? cooldownUntil > new Date() : false;
  const daysRemaining = isInCooldown
    ? Math.ceil((cooldownUntil!.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;

  const handleRequestUsernameChange = async () => {
    setUsernameRequestError(null);
    setIsRequestingUsername(true);
    try {
      const res = await fetch("/api/user/username-change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const json = await res.json();
      console.log(
        "[AccountSettings] Username change request:",
        res.status,
        json,
      );

      if (res.status === 429 && json.error === "cooldown") {
        setUsernameRequestError(
          t("settings.username_cooldown_error", {
            days: String(json.daysRemaining ?? daysRemaining),
          }),
        );
        return;
      }
      if (res.status === 429) {
        const expires = new Date(json.expiresAt);
        setPendingExpiresAt(expires);
        setUsernameRequestState("pending");
        return;
      }
      if (!res.ok) {
        setUsernameRequestError(t("settings.username_change_error"));
        return;
      }

      setUsernameRequestState("sent");
    } catch {
      setUsernameRequestError(t("settings.username_change_error"));
    } finally {
      setIsRequestingUsername(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendState("idle");
    try {
      const res = await fetch("/api/users/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-verification", locale }),
      });
      console.log("[AccountSettings] Resend verification status:", res.status);
      if (res.status === 429) {
        setResendState("cooldown");
        return;
      }
      if (!res.ok) {
        setResendState("error");
        return;
      }
      setResendState("sent");

      const approxExpiry = new Date(Date.now() + 60 * 60 * 1000);
      setResendExpiresAt(approxExpiry);
      mutateSecurity(
        (prev) =>
          prev
            ? {
                ...prev,
                resendCooldown: true,
                resendCooldownExpiresAt: approxExpiry.toISOString(),
              }
            : prev,
        false,
      );
    } catch {
      setResendState("error");
    } finally {
      setIsResending(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!profile.email) return;
    setPasswordResetState("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, locale }),
      });
      console.log("[AccountSettings] Password reset trigger:", res.status);
      if (!res.ok) {
        setPasswordResetState("error");
        return;
      }
      setPasswordResetState("sent");

      const approxExpiry = new Date(Date.now() + 60 * 60 * 1000);
      setPasswordResetExpiresAt(approxExpiry);
      mutateSecurity(
        (prev) =>
          prev
            ? {
                ...prev,
                passwordResetPending: true,
                passwordResetExpiresAt: approxExpiry.toISOString(),
              }
            : prev,
        false,
      );
    } catch {
      setPasswordResetState("error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Email Verification Card - shown for both verified and unverified */}
      {security &&
        (security.emailVerified ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-surface border border-feedback-success/30 rounded-2xl p-6">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-feedback-success">
                {t("settings.email_verification_title")}
              </h3>
              <p className="text-sm text-foreground-60 leading-relaxed">
                {t("settings.email_verified_desc")}
              </p>
            </div>
            <Button
              variant="outline-success"
              disabled
              className="shrink-0 w-full sm:w-auto cursor-default"
            >
              {t("settings.email_verified_btn")}
            </Button>
          </div>
        ) : (
          <div className="bg-surface border border-warning/30 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-warning">
                  {t("settings.email_verification_title")}
                </h3>
                <p className="text-sm text-foreground-60 leading-relaxed">
                  {t("settings.email_unverified_banner")}
                </p>
              </div>
              <Button
                variant="outline-warning"
                onClick={handleResendVerification}
                disabled={isResending || isResendOnCooldown}
                className="shrink-0 w-full sm:w-auto cursor-pointer relative"
              >
                <span className={isResending ? "invisible" : ""}>
                  {t("settings.resend_verification")}
                </span>
                {isResending && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                )}
              </Button>
            </div>
            {resendState === "sent" && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-feedback-success/10 border border-feedback-success/30">
                <CheckCircle2 className="h-5 w-5 text-feedback-success shrink-0" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-feedback-success">
                    {t("settings.verification_sent_title")}
                  </p>
                  <p className="text-xs text-foreground-60">
                    {resendTimeLeft
                      ? t("settings.verification_sent_desc", {
                          email: profile.email ?? "",
                          timeLeft: resendTimeLeft,
                        })
                      : t("settings.verification_sent_desc_no_time", {
                          email: profile.email ?? "",
                        })}
                  </p>
                </div>
              </div>
            )}
            {isResendOnCooldown && resendState !== "sent" && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
                <Clock className="h-5 w-5 text-warning shrink-0" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-warning">
                    {t("settings.verification_cooldown_title")}
                  </p>
                  <p className="text-xs text-foreground-60">
                    {resendTimeLeft
                      ? t("settings.verification_cooldown_desc", {
                          timeLeft: resendTimeLeft,
                        })
                      : t("settings.verification_cooldown_desc_no_time")}
                  </p>
                </div>
              </div>
            )}
            {resendState === "error" && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-feedback-error/10 border border-feedback-error/30">
                <AlertCircle className="h-5 w-5 text-feedback-error shrink-0" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-feedback-error">
                    {t("settings.verification_error_title")}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

      <div className="flex flex-col gap-8 bg-surface border border-surface-border rounded-2xl p-6">
        {/* Email - read-only */}
        {profile.email && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              {t("settings.email_label")}
            </label>
            <div className="px-4 py-3 bg-background border border-surface-border rounded-xl text-sm text-foreground-60 opacity-60 cursor-not-allowed select-all">
              {profile.email}
            </div>
            <p className="text-xs text-foreground-40 px-1">
              {t("settings.email_locked_hint")}
            </p>
          </div>
        )}

        <div className="h-px w-full bg-surface-border" />

        {/* Username - read-only display + change button */}
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-foreground">
            {t("settings.username_label")}
          </label>

          <div className="flex items-center gap-2 px-4 py-3 bg-background border border-surface-border rounded-xl opacity-60 cursor-not-allowed">
            <span className="text-sm font-medium text-foreground-40 select-none shrink-0">
              u/
            </span>
            <span className="text-sm text-foreground">{profile.username}</span>
          </div>

          {isInCooldown ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <Clock className="h-5 w-5 text-warning shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-warning">
                  {daysRemaining === 1
                    ? t("settings.username_cooldown_info_singular")
                    : t("settings.username_cooldown_info", {
                        days: String(daysRemaining),
                      })}
                </p>
                <p className="text-xs text-foreground-60">
                  {t("settings.username_cooldown_info_desc")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <p className="text-sm text-foreground-60 leading-relaxed">
                    {t("settings.username_change_desc")}
                  </p>
                  {usernameRequestError && (
                    <p className="hidden sm:block text-xs font-medium text-feedback-error animate-in fade-in">
                      {usernameRequestError}
                    </p>
                  )}
                </div>
                <Button
                  variant="brand"
                  disabled={
                    isRequestingUsername ||
                    usernameRequestState === "pending" ||
                    usernameRequestState === "sent"
                  }
                  onClick={handleRequestUsernameChange}
                  className="shrink-0 w-full sm:w-auto cursor-pointer relative"
                >
                  <span className={isRequestingUsername ? "invisible" : ""}>
                    {t("settings.username_request_btn")}
                  </span>
                  {isRequestingUsername && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                  )}
                </Button>
                {usernameRequestError && (
                  <p className="sm:hidden text-xs font-medium text-feedback-error text-center animate-in fade-in">
                    {usernameRequestError}
                  </p>
                )}
              </div>

              {usernameRequestState === "pending" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
                  <Clock className="h-5 w-5 text-warning shrink-0" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-warning">
                      {t("settings.username_change_pending_title")}
                    </p>
                    <p className="text-xs text-foreground-60">
                      {usernameTimeLeft
                        ? t("settings.username_change_pending_desc_simple", {
                            timeLeft: usernameTimeLeft,
                          })
                        : t("settings.username_change_pending_desc_simple", {
                            timeLeft: "...",
                          })}
                    </p>
                  </div>
                </div>
              )}

              {usernameRequestState === "sent" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-feedback-success/10 border border-feedback-success/30">
                  <CheckCircle2 className="h-5 w-5 text-feedback-success shrink-0" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-feedback-success">
                      {t("settings.username_change_sent")}
                    </p>
                    <p className="text-xs text-foreground-60">
                      {t("settings.username_change_sent_desc", {
                        email: profile.email ?? "",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="h-px w-full bg-surface-border" />

        {/* Change Password */}
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-foreground">
            {t("settings.change_password_heading")}
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <p className="text-sm text-foreground-60 leading-relaxed">
                {t("settings.change_password_desc")}
              </p>
              {passwordResetState === "error" && (
                <p className="hidden sm:block text-xs font-medium text-feedback-error animate-in fade-in">
                  {t("settings.change_password_error")}
                </p>
              )}
            </div>
            <Button
              variant="brand"
              onClick={handleSendPasswordReset}
              disabled={
                passwordResetState === "sending" || isPasswordResetPending
              }
              className="shrink-0 w-full sm:w-auto cursor-pointer relative"
            >
              <span
                className={passwordResetState === "sending" ? "invisible" : ""}
              >
                {t("settings.change_password_send_btn")}
              </span>
              {passwordResetState === "sending" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
              )}
            </Button>
            {passwordResetState === "error" && (
              <p className="sm:hidden text-xs font-medium text-feedback-error text-center animate-in fade-in">
                {t("settings.change_password_error")}
              </p>
            )}
          </div>
          {passwordResetState === "sent" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-feedback-success/10 border border-feedback-success/30">
              <CheckCircle2 className="h-5 w-5 text-feedback-success shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-feedback-success">
                  {t("settings.change_password_sent")}
                </p>
                <p className="text-xs text-foreground-60">
                  {t("settings.change_password_sent_desc", {
                    email: profile.email ?? "",
                  })}
                </p>
              </div>
            </div>
          )}
          {isPasswordResetPending && passwordResetState !== "sent" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <Clock className="h-5 w-5 text-warning shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-warning">
                  {t("settings.password_reset_pending_title")}
                </p>
                <p className="text-xs text-foreground-60">
                  {passwordResetTimeLeft
                    ? t("settings.password_reset_pending_desc", {
                        timeLeft: passwordResetTimeLeft,
                      })
                    : t("settings.password_reset_pending_desc_no_time")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {profile.email && <DeleteAccountSection email={profile.email} />}
    </div>
  );
}
