// src/components/moderation/ban-mute-modal.tsx
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
import { BanMuteModalProps, DurationMode } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

const isDurationMode = (value: string): value is DurationMode =>
  ["24h", "48h", "72h", "custom", "infinite"].includes(value);

export function BanMuteModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  targetUsername,
  onSuccessComplete,
}: BanMuteModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [durationMode, setDurationMode] = useState<DurationMode>("24h");
  const [customDays, setCustomDays] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayUsername = targetUsername.startsWith("u/")
    ? targetUsername
    : `u/${targetUsername}`;

  const title =
    actionType === "ban"
      ? t("communityPage.ban_user_title").replace("{{user}}", displayUsername)
      : t("communityPage.mute_user_title").replace("{{user}}", displayUsername);

  const resetState = () => {
    setReason("");
    setDurationMode("24h");
    setCustomDays("");
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

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      let durationHours: number | null = null;
      if (durationMode === "24h") durationHours = 24;
      else if (durationMode === "48h") durationHours = 48;
      else if (durationMode === "72h") durationHours = 72;
      else if (durationMode === "custom" && typeof customDays === "number") {
        durationHours = customDays * 24;
      }

      await onConfirm(actionType, durationHours, reason.trim() || null);

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

  const isCustomInvalid =
    durationMode === "custom" && (customDays === "" || customDays <= 0);

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
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-foreground">
                      {t("communityPage.duration_label")}
                    </label>
                    <Select
                      value={durationMode}
                      onValueChange={(val) => {
                        if (isDurationMode(val)) setDurationMode(val);
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">
                          {t("communityPage.duration_24h")}
                        </SelectItem>
                        <SelectItem value="48h">
                          {t("communityPage.duration_48h")}
                        </SelectItem>
                        <SelectItem value="72h">
                          {t("communityPage.duration_72h")}
                        </SelectItem>
                        <SelectItem value="custom">
                          {t("communityPage.custom_days")}
                        </SelectItem>
                        <SelectItem value="infinite">
                          {t("communityPage.infinite")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {durationMode === "custom" && (
                    <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand animate-in fade-in slide-in-from-top-2">
                      <input
                        type="number"
                        min="1"
                        placeholder=" "
                        value={customDays}
                        onChange={(e) =>
                          setCustomDays(
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        disabled={isLoading}
                        className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all"
                      />
                      <label className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background">
                        {t("communityPage.number_of_days")}
                      </label>
                    </div>
                  )}

                  <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                    <textarea
                      rows={3}
                      placeholder=" "
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={isLoading}
                      className="peer w-full px-4 pt-6 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all resize-none text-sm"
                    />
                    <label className="absolute left-3 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background">
                      {t("communityPage.reason_optional")}
                    </label>
                  </div>
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
                  {(actionType === "ban"
                    ? t("communityPage.ban_success_message")
                    : t("communityPage.mute_success_message")
                  ).replace("{{user}}", displayUsername)}
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
                  onClick={handleConfirm}
                  disabled={isLoading || isCustomInvalid}
                  variant="primary"
                >
                  {isLoading
                    ? t("communityPage.loading_dots")
                    : t("communityPage.confirm")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
