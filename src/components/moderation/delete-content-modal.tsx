// src/components/ui/moderation/delete-content-modal.tsx
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
import React, { useEffect, useRef, useState } from "react";

interface DeleteContentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-translated modal title */
  title: string;
  /** Pre-translated description shown before confirm */
  description: string;
  /** Pre-translated success message, e.g. "Post by u/alice was successfully deleted" */
  successMessage: string;
  /** Show an optional reason textarea (posts only) */
  showReason?: boolean;
  reason?: string;
  onReasonChange?: (value: string) => void;
  /** Pre-translated label for the reason field */
  reasonLabel?: string;
  /** Async action to perform - should throw on failure */
  onConfirm: () => Promise<void>;
  /** Called after the success animation closes the modal */
  onSuccessComplete?: () => void;
  /** Pre-translated confirm button label */
  confirmLabel?: string;
  /** Pre-translated confirm button label while loading */
  confirmingLabel?: string;
}

export function DeleteContentModal({
  isOpen,
  onOpenChange,
  title,
  description,
  successMessage,
  showReason = false,
  reason = "",
  onReasonChange,
  reasonLabel = "",
  onConfirm,
  onSuccessComplete,
  confirmLabel,
  confirmingLabel,
}: DeleteContentModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = () => {
    setIsLoading(false);
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
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onConfirm();
      setIsTransitioning(true);
      setPhase("success");
      successTimeoutRef.current = setTimeout(() => setSuccessOpacity(1), 300);
      closeTimeoutRef.current = setTimeout(() => {
        onOpenChange(false);
        resetState();
        onSuccessComplete?.();
      }, 1900);
    } catch {
      setIsLoading(false);
      setIsTransitioning(false);
    }
  };

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
          <DialogTitle className="font-bold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Override DialogBody's inline overflowY: auto to prevent scrollbar during animation */}
        <DialogBody style={{ overflowY: "hidden" }}>
          <form onSubmit={handleSubmit}>
            {/* Description + optional reason field (collapses on success) */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: show ? "1fr" : "0fr",
                transition: "grid-template-rows 300ms ease-in-out",
              }}
            >
              <div style={gridInnerStyle}>
                <div
                  className="flex flex-col gap-5 pb-6"
                  style={{
                    opacity: show ? 1 : 0,
                    transition: "opacity 150ms ease-in-out",
                  }}
                >
                  <p className="text-sm text-foreground-60">{description}</p>

                  {showReason && onReasonChange && (
                    <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                      <textarea
                        id="delete-content-reason"
                        rows={3}
                        placeholder=" "
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        disabled={isLoading}
                        className="peer w-full px-4 pt-6 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all resize-none text-sm"
                      />
                      <label
                        htmlFor="delete-content-reason"
                        className="absolute left-3 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                          peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
                      >
                        {reasonLabel}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Success message (expands on success) */}
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
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer buttons (collapses on success) */}
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
                    type="submit"
                    disabled={isLoading}
                    className="bg-brand hover:bg-brand/90 text-white border-brand"
                  >
                    {isLoading
                      ? (confirmingLabel ?? t("communityPage.deleting_post"))
                      : (confirmLabel ??
                        t("communityPage.confirm_delete_post"))}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
