// src/app/[locale]/(protected)/communities/[name]/members/(components)/kick-user-modal.tsx
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
import { KickUserModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function KickUserModal({
  isOpen,
  onClose,
  onConfirm,
  targetUsername,
  communityName,
}: KickUserModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayUsername = targetUsername.startsWith("u/")
    ? targetUsername
    : `u/${targetUsername}`;
  const displayCommunityName = `c/${communityName}`;

  const resetState = () => {
    setReason("");
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
      await onConfirm(reason.trim() || null);

      setIsTransitioning(true);
      setPhase("success");

      successTimeoutRef.current = setTimeout(() => {
        setSuccessOpacity(1);
      }, 300);

      closeTimeoutRef.current = setTimeout(() => {
        onClose();
        resetState();
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
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <DialogTitle className="font-bold text-foreground">
            {t("communityPage.kick_user_title", {
              target: displayUsername,
              community: communityName,
            })}
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
                  {(() => {
                    const [beforeTarget, afterTarget] = t(
                      "communityPage.kick_user_desc",
                    ).split("{{target}}");
                    const [beforeCommunity, afterCommunity] =
                      afterTarget.split("{{community}}");

                    return (
                      <p className="text-sm text-foreground-60">
                        {beforeTarget}
                        <span className="text-foreground">
                          {displayUsername}
                        </span>
                        {beforeCommunity}
                        <span className="text-foreground">
                          {displayCommunityName}
                        </span>
                        {afterCommunity}
                      </p>
                    );
                  })()}

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
                  {t("communityPage.kick_success_message").replace(
                    "{{user}}",
                    displayUsername,
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
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                >
                  {t("communityPage.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  variant="brand"
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
