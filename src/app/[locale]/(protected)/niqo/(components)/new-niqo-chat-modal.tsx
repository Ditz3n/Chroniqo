// src/app/[locale]/(protected)/niqo/(components)/new-niqo-chat-modal.tsx
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
import { NewNiqoChatModalProps } from "@/types/app-types";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function NewNiqoChatModal({
  isOpen,
  onClose,
  onConfirm,
  onSuccessComplete,
}: NewNiqoChatModalProps) {
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
    onClose();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const generatedChatId = await onConfirm();
      setIsTransitioning(true);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        onClose();
        resetState();
        onSuccessComplete?.(generatedChatId || undefined);
      }, 1500);
    } catch (error) {
      console.error("Failed to start chat:", error);
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
          <DialogTitle className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            {t("niqo.new_chat_warning_title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody style={{ overflowY: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="px-4 pt-4 pb-8"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <div className="text-sm text-foreground-60">
                  {t("niqo.new_chat_warning_desc")}
                </div>
              </div>
            </div>
          </div>

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
                <p className="text-foreground font-bold text-lg text-center flex items-center gap-2">
                  {t("niqo.new_chat_success")}
                </p>
              </div>
            </div>
          </div>

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
                >
                  {t("niqo.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {t("niqo.confirm")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
