// src/app/[locale]/(protected)/messages/(components)/extend-chat-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface ExtendChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationHours: 24 | 48 | 72) => Promise<void>;
  currentExpiration: string | null;
}

export function ExtendChatModal({
  isOpen,
  onClose,
  onConfirm,
  currentExpiration,
}: ExtendChatModalProps) {
  const { t, locale } = useTranslation();
  const [duration, setDuration] = useState<24 | 48 | 72>(24);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = () => {
    setDuration(24);
    setIsLoading(false);
    setError(null);
    setIsTransitioning(false);
    setPhase("idle");
    setSuccessOpacity(0);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(duration);

      setIsTransitioning(true);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        onClose();
        resetState();
      }, 1900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
      setIsTransitioning(false);
    }
  };

  const formattedExpiration = currentExpiration
    ? new Date(currentExpiration)
        .toLocaleString(locale === "da" ? "da-DK" : "en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(",", "")
    : "-";

  const show = phase === "idle";
  const gridInnerStyle: React.CSSProperties = {
    overflow: "clip",
    minHeight: 0,
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) =>
        !open && !isLoading && !isTransitioning && handleClose()
      }
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold">
            {t("MessagesPage.extend_chat_title")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody style={{ overflowY: "hidden" }}>
          {/* Form */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <form
                id="extend-chat-form"
                onSubmit={handleSubmit}
                className="px-4 pt-4 pb-8 flex flex-col gap-5"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <p className="text-sm text-foreground-60">
                  {t("MessagesPage.extend_chat_desc")}
                </p>

                {error && (
                  <div className="p-3 text-sm text-white bg-brand rounded-xl font-medium">
                    {error}
                  </div>
                )}

                <div className="p-3 bg-surface border border-surface-border rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground-40 block mb-1">
                    {t("MessagesPage.chat_expires_in")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formattedExpiration}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">
                    {t("MessagesPage.extend_chat_duration_label")}
                  </label>
                  <div className="flex gap-2">
                    {([24, 48, 72] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        disabled={isLoading}
                        onClick={() => setDuration(h)}
                        className={cn(
                          "flex-1 py-2 text-sm font-bold rounded-xl border transition-colors cursor-pointer",
                          duration === h
                            ? "bg-brand text-white border-brand"
                            : "bg-background border-surface-border text-foreground-60 hover:text-foreground",
                        )}
                      >
                        {t(`MessagesPage.duration_${h}h`)}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Success */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: !show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="flex flex-col items-center justify-center pt-6 pb-10 gap-4"
                style={{
                  opacity: successOpacity,
                  transition: "opacity 300ms ease-in-out",
                }}
              >
                <p className="text-foreground font-bold text-lg text-center">
                  {t("MessagesPage.extend_chat_success")}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="-mx-4 -mb-4"
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="flex items-center justify-end gap-3 px-4 py-3 border-t border-surface-border bg-surface"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                  pointerEvents: show ? "auto" : "none",
                }}
              >
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                >
                  {t("communityPage.cancel")}
                </Button>
                <Button
                  form="extend-chat-form"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? t("MessagesPage.extending")
                    : t("MessagesPage.extend_chat")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
