// src/app/[locale]/onboarding/(components)/email-verification-gate.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { Mail } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 3_000;
const RESEND_COOLDOWN_S = 60;

interface Props {
  email: string;
  onVerified: () => void;
}

export function EmailVerificationGate({ email, onVerified }: Props) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable ref so polling closure never captures a stale onVerified
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const startCountdown = useCallback((from: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(from);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, []);

  const sendResendRequest = useCallback(async () => {
    const res = await fetch("/api/auth/resend-signup-verification", {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      // Sync countdown to server-reported creation time for accuracy
      const ageSeconds =
        (Date.now() - new Date(data.tokenCreatedAt).getTime()) / 1_000;
      startCountdown(Math.max(1, Math.ceil(RESEND_COOLDOWN_S - ageSeconds)));
    }
  }, [startCountdown]);

  // On mount: check current status and decide whether to auto-resend.
  // - Token created within last 60s → fresh signup, just show remaining cooldown.
  // - Token is stale or missing → user returned after browser close, auto-resend.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/signup-verification-status");
        const data = await res.json();

        if (cancelled) return;

        if (data.verified) {
          onVerifiedRef.current();
          return;
        }

        if (data.tokenCreatedAt) {
          const ageSeconds =
            (Date.now() - new Date(data.tokenCreatedAt).getTime()) / 1_000;
          if (ageSeconds < RESEND_COOLDOWN_S) {
            // Token is recent - preserve it and show remaining countdown
            startCountdown(Math.ceil(RESEND_COOLDOWN_S - ageSeconds));
            return;
          }
        }

        // Token is stale or absent - auto-resend for returning user
        await sendResendRequest();
      } catch {
        // Silent: best-effort auto-resend on network error
        try {
          if (!cancelled) await sendResendRequest();
        } catch {
          /* silent */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run once on mount

  // Poll for verification every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/signup-verification-status");
        const data = await res.json();
        if (data.verified) {
          clearInterval(interval);
          onVerifiedRef.current();
        }
      } catch {
        /* silent - next tick will retry */
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []); // No deps - uses ref for callback, no stale closure risk

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleManualResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    try {
      await sendResendRequest();
    } catch {
      /* silent */
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-4 w-full">
      <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
        <Mail size={28} className="text-brand" />
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h2 className="text-2xl font-heading font-bold text-foreground">
          {t("signupVerification.title")}
        </h2>
        <p className="text-sm text-foreground-60 leading-relaxed">
          {t("signupVerification.subtitle").replace("{{email}}", email)}
        </p>
        <p className="text-sm text-foreground-60 leading-relaxed">
          {t("signupVerification.description")}
        </p>
      </div>

      <button
        type="button"
        onClick={handleManualResend}
        disabled={countdown > 0 || isResending}
        className="px-5 py-2 rounded-full border border-surface-border text-sm font-semibold transition-colors hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
      >
        {countdown > 0
          ? t("signupVerification.resend_countdown").replace(
              "{{seconds}}",
              String(countdown),
            )
          : isResending
            ? t("signupVerification.resending")
            : t("signupVerification.resend_button")}
      </button>

      <p className="text-xs text-foreground-40">
        {t("signupVerification.checking")}
      </p>
    </div>
  );
}
