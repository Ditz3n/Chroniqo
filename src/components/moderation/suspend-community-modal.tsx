// src/components/moderation/suspend-community-modal.tsx
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
import { SuspendCommunityModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function SuspendCommunityModal({
  isOpen,
  onClose,
  onConfirm,
  isCurrentlySuspended,
  initialReason,
  targetName,
}: SuspendCommunityModalProps) {
  const { t } = useTranslation();
  const [actionReason, setActionReason] = useState(initialReason || "");
  const [duration, setDuration] = useState<string>("24");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const [successAction, setSuccessAction] = useState<"suspend" | "lift" | null>(
    null,
  );
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setActionReason(initialReason || "");
    setDuration("24");
    setIsLoading(false);
    setPhase("idle");
    setSuccessOpacity(0);
    setSuccessAction(null);
    onClose();
  };

  const handleSubmit = async (
    e: React.FormEvent,
    action: "suspend" | "lift",
  ) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onConfirm(action, actionReason, duration);
      setSuccessAction(action);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        handleClose();
      }, 1900);
    } catch {
      setIsLoading(false);
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
        !open && !isLoading && phase === "idle" && handleClose()
      }
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold text-foreground flex items-center gap-2">
            {isCurrentlySuspended
              ? t("admin.update_suspension")
              : t("admin.suspend_community")}
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
              <div
                className="px-4 pt-4 pb-8"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <form
                  id="suspend-community-form"
                  onSubmit={(e) => handleSubmit(e, "suspend")}
                  noValidate
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-foreground">
                      {t("admin.duration_label")}
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
                  <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                    <textarea
                      rows={3}
                      placeholder=" "
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      disabled={isLoading}
                      className="peer w-full px-4 pt-6 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none resize-none text-sm"
                    />
                    <label className="absolute left-3 top-4 text-sm text-foreground-60 transition-all pointer-events-none px-1 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background">
                      {t("communityPage.reason_optional")}
                    </label>
                  </div>
                </form>
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
                  {successAction === "lift"
                    ? t("admin.lift_suspension_success").replace(
                        "{{target}}",
                        targetName,
                      )
                    : t("admin.update_suspension_success").replace(
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
                {isCurrentlySuspended && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={(e) => handleSubmit(e, "lift")}
                    disabled={isLoading}
                    className="mr-auto"
                  >
                    {t("admin.lift_suspension")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  {t("communityPage.cancel")}
                </Button>
                <Button
                  form="suspend-community-form"
                  type="submit"
                  variant="outline-warning"
                  disabled={isLoading}
                >
                  {t("communityPage.confirm")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
