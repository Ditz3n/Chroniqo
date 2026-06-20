// src/components/moderation/extend-ban-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ExtendBanModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function ExtendBanModal({
  isOpen,
  onClose,
  onConfirm,
  targetIdentifier,
  currentExpiration,
}: ExtendBanModalProps) {
  const { t, locale } = useTranslation();
  const [duration, setDuration] = useState<string>("24");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = () => {
    setDuration("24");
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
      const durationHours =
        duration === "permanent" ? null : parseInt(duration, 10);
      await onConfirm(durationHours);

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
    ? new Date(currentExpiration).toLocaleString(locale)
    : t("admin.infinite");
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
            {t("admin.extend_ban_title").replace(
              "{{target}}",
              targetIdentifier,
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
              <form
                id="extend-ban-form"
                onSubmit={handleSubmit}
                className="px-4 pt-4 pb-8 flex flex-col gap-5"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <p className="text-sm text-foreground-60">
                  {t("admin.extend_ban_desc")}
                </p>

                {error && (
                  <div className="p-3 text-sm text-white bg-brand rounded-xl font-medium">
                    {error}
                  </div>
                )}

                <div className="p-3 bg-surface border border-surface-border rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground-40 block mb-1">
                    {t("admin.current_expiration")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formattedExpiration}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">
                    {t("admin.new_duration")}
                  </label>
                  <Select
                    value={duration}
                    onValueChange={setDuration}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">
                        {t("admin.duration_24h")}
                      </SelectItem>
                      <SelectItem value="168">
                        {t("admin.duration_7d")}
                      </SelectItem>
                      <SelectItem value="720">
                        {t("admin.duration_30d")}
                      </SelectItem>
                      <SelectItem value="permanent">
                        {t("admin.infinite")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                  {t("admin.extend_success")}
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
                  form="extend-ban-form"
                  type="submit"
                  variant="outline-warning"
                  disabled={isLoading}
                >
                  {isLoading ? t("admin.generating") : t("admin.extend_ban")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
