// src/components/moderation/clear-community-reports-modal.tsx
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
import { ClearCommunityReportsModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function ClearCommunityReportsModal({
  isOpen,
  onClose,
  onConfirm,
  targetName,
  onSuccessComplete,
}: ClearCommunityReportsModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [descBeforeTarget, descAfterTarget] = t(
    "admin.clear_community_reports_desc",
  ).split("{{target}}");

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
      await onConfirm();
      setIsTransitioning(true);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        onClose();
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
            {t("admin.clear_community_reports_title").replace(
              "{{target}}",
              targetName,
            )}
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
                className="px-4 pt-4 pb-8"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <div className="text-sm text-foreground-60">
                  {descBeforeTarget}
                  <span className="text-foreground font-semibold">
                    {targetName}
                  </span>
                  {descAfterTarget}
                </div>
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
                  {t("admin.clear_community_reports_success").replace(
                    "{{target}}",
                    targetName,
                  )}
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
                >
                  {t("communityPage.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="outline-warning"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {t("admin.clear_reports")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
