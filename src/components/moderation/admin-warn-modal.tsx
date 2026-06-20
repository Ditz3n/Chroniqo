// src/components/moderation/admin-warn-modal.tsx
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
import { AdminWarnModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function AdminWarnModal({
  isOpen,
  onClose,
  onConfirm,
  targetName,
  type,
}: AdminWarnModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = () => {
    setIsLoading(false);
    setIsTransitioning(false);
    setPhase("idle");
    setSuccessOpacity(0);
    setError(null);
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

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
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

  const titleKey =
    type === "USER" ? "admin.warn_user_title" : "admin.warn_community_title";
  const descKey =
    type === "USER"
      ? "admin.confirm_warn_user"
      : "admin.confirm_warn_community";
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
      <DialogContent className="bg-background p-0 overflow-hidden gap-0 sm:max-w-md">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold flex items-center gap-2 text-foreground">
            {t(titleKey).replace("{{target}}", targetName)}
          </DialogTitle>
        </DialogHeader>

        {/* Override DialogBody's inline overflowY: auto to prevent scrollbar during animation */}
        <DialogBody style={{ overflowY: "hidden" }}>
          {/* Description */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="px-4 pt-4 pb-8 flex flex-col justify-center"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <p className="text-sm text-foreground-60">{t(descKey)}</p>

                {error && (
                  <div className="p-3 text-sm text-white bg-brand rounded-xl font-medium mt-5">
                    {error}
                  </div>
                )}
              </div>
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
                  {t("admin.warn_success").replace("{{target}}", targetName)}
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
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  variant="outline-warning"
                >
                  {isLoading
                    ? t("communityPage.sending")
                    : t("admin.send_warning_btn")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
