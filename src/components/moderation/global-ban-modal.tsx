// src/components/moderation/global-ban-modal.tsx
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
import { GlobalBanModalProps } from "@/types/app-types";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export function GlobalBanModal({
  isOpen,
  onClose,
  onConfirm,
  username,
  onSuccessComplete,
}: GlobalBanModalProps) {
  const { t } = useTranslation();
  const [banReason, setBanReason] = useState("");
  const [duration, setDuration] = useState<string>("permanent");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetName = `u/${username}`;

  const { data: session } = useSession();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setBanReason("");
    setDuration("permanent");
    setIsLoading(false);
    setIsTransitioning(false);
    setPhase("idle");
    setSuccessOpacity(0);
    setSuccessMessage(null);
    setError(null);
  };

  const handleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    resetState();
    onClose();
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent banning yourself client-side — show as the success panel
    if (session?.user?.username && session.user.username === username) {
      const msg = t("admin.ban_cannot_self");
      setSuccessMessage(msg);
      setIsTransitioning(true);
      setPhase("success");
      successTimeoutRef.current = setTimeout(() => setSuccessOpacity(1), 300);
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
        resetState();
        onSuccessComplete?.();
      }, 1900);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm(banReason, duration);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("admin.ban_failed");
      setError(msg);
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
          <DialogTitle className="font-bold">
            {t("admin.ban_user_title").replace("{{user}}", username)}
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
                id="global-ban-form"
                onSubmit={handleSubmit}
                className="px-4 pt-4 pb-8 flex flex-col gap-5"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                <p className="text-sm text-foreground-60">
                  {t("admin.ban_user_desc")}
                </p>

                {error && (
                  <div className="p-3 text-sm text-white bg-brand rounded-xl font-medium mt-5">
                    {error}
                  </div>
                )}

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

                <div className="relative rounded-xl border border-surface-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                  <textarea
                    rows={3}
                    placeholder=" "
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    disabled={isLoading}
                    className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none resize-none text-sm"
                  />
                  <label className="absolute left-3 top-4 text-sm text-foreground-60 transition-all pointer-events-none px-1 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background">
                    {t("communityPage.reason_optional")}
                  </label>
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
                {successMessage ? (
                  <p className="text-foreground font-bold text-lg text-center">
                    {successMessage}
                  </p>
                ) : (
                  <p className="text-foreground font-bold text-lg text-center">
                    {t("admin.ban_success").replace("{{target}}", targetName)}
                  </p>
                )}
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
                  form="global-ban-form"
                  type="submit"
                  variant="brand"
                  disabled={isLoading}
                >
                  {t("admin.ban_user")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
