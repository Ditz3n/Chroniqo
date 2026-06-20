// src/app/[locale]/(protected)/u/[username]/settings/(components)/delete-account-section.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/use-translation";
import { DeleteAccountSectionProps, SectionState } from "@/types/app-types";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Returns a human-readable string for the time remaining until a given date
function formatTimeLeft(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "";
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}

export function DeleteAccountSection({ email }: DeleteAccountSectionProps) {
  const { t, locale } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingExpiresAt, setPendingExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const [state, setState] = useState<SectionState>("idle");

  const { data: deleteCheckData } = useSWR<{
    pendingToken: { expiresAt: string } | null;
  }>("/api/user/delete-request", fetcher, { revalidateOnFocus: false });

  const deleteInitRef = useRef(false);
  useEffect(() => {
    if (!deleteCheckData || deleteInitRef.current) return;
    deleteInitRef.current = true;
    if (deleteCheckData.pendingToken?.expiresAt) {
      const expires = new Date(deleteCheckData.pendingToken.expiresAt);
      setPendingExpiresAt(expires);
      setTimeLeft(formatTimeLeft(expires));
      setState("pending");
    }
  }, [deleteCheckData]);

  // Tick the countdown every minute while in pending state
  useEffect(() => {
    if (state !== "pending" || !pendingExpiresAt) return;

    const interval = setInterval(() => {
      const left = formatTimeLeft(pendingExpiresAt);
      if (!left) {
        // Token has expired - allow a new request
        setPendingExpiresAt(null);
        setState("idle");
        clearInterval(interval);
      } else {
        setTimeLeft(left);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [state, pendingExpiresAt]);

  const handleRequestDeletion = async () => {
    setIsSending(true);
    setError(null);
    try {
      console.log("[DeleteAccountSection] Sending deletion request email");
      const res = await fetch("/api/user/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });

      if (res.status === 429) {
        // Another request beat us to it between mount-check and click
        const json = await res.json();
        const expires = new Date(json.expiresAt);
        setPendingExpiresAt(expires);
        setTimeLeft(formatTimeLeft(expires));
        setState("pending");
        return;
      }

      if (!res.ok) throw new Error("Request failed");

      console.log("[DeleteAccountSection] Deletion email sent successfully");
      setState("sent");
    } catch (err) {
      console.error("[DeleteAccountSection] Error:", err);
      setError(t("settings.dangerZone.error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-surface border border-brand/30 rounded-2xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-brand">
        {t("settings.dangerZone.title")}
      </h3>

      <div className="flex items-start gap-3 p-3 rounded-xl bg-brand/5 border border-brand/10">
        <AlertTriangle className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <p className="text-xs text-foreground-60 leading-relaxed">
          {t("settings.dangerZone.warning")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <p className="text-sm text-foreground-60 leading-relaxed">
            {t("settings.dangerZone.description")}
          </p>
          {error && (
            <p className="text-xs font-medium text-feedback-error">{error}</p>
          )}
        </div>
        <Button
          variant="outline-brand"
          onClick={handleRequestDeletion}
          disabled={isSending || state === "pending" || state === "sent"}
          className="shrink-0 w-full sm:w-auto cursor-pointer gap-2 relative"
        >
          <span
            className={
              isSending
                ? "invisible flex items-center gap-2"
                : "flex items-center gap-2"
            }
          >
            {t("settings.dangerZone.delete_btn")}
          </span>
          {isSending && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          )}
        </Button>
      </div>

      {state === "sent" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-feedback-success/10 border border-feedback-success/30">
          <CheckCircle2 className="h-5 w-5 text-feedback-success shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-feedback-success">
              {t("settings.dangerZone.email_sent")}
            </p>
            <p className="text-xs text-foreground-60">
              {t("settings.dangerZone.email_sent_desc", { email })}
            </p>
          </div>
        </div>
      )}

      {state === "pending" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
          <Clock className="h-5 w-5 text-warning shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-warning">
              {t("settings.dangerZone.pending_title")}
            </p>
            <p className="text-xs text-foreground-60">
              {t("settings.dangerZone.pending_desc", { timeLeft })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
