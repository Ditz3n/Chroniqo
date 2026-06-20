// src/app/[locale]/(protected)/messages/(components)/assign-nickname-modal.tsx
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
import { AssignNicknameModalProps } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";

export function AssignNicknameModal({
  isOpen,
  onClose,
  userId,
  targetName,
  targetUsername,
  currentNickname,
  onSave,
}: AssignNicknameModalProps) {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(currentNickname);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignNicknameDescTemplate = t("MessagesPage.assign_nickname_desc");
  const [descBeforeUser = "", descAfterUser = ""] =
    assignNicknameDescTemplate.split("{{user}}");
  const displayName = targetName.trim() || targetUsername?.trim() || "";
  const displayTarget = targetUsername ? `u/${targetUsername}` : displayName;

  const resetState = () => {
    setNickname(currentNickname);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(userId, nickname);
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
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 bg-background border-surface-border [&>button]:hidden">
        <DialogHeader
          className="bg-surface py-4 px-6 border-b border-surface-border pr-4"
          onClose={handleClose}
        >
          <DialogTitle className="font-bold text-foreground">
            {t("MessagesPage.assign_nickname_title").replace(
              "{{target}}",
              displayTarget,
            )}
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
                  id="assign-nickname-form"
                  onSubmit={handleSave}
                  className="flex flex-col gap-5"
                >
                  <p className="text-sm text-foreground-60">
                    {descBeforeUser}
                    <span className="text-foreground font-semibold">
                      {displayName}
                    </span>
                    {targetUsername && (
                      <>
                        {" "}
                        (
                        <span className="text-foreground font-semibold">
                          u/{targetUsername}
                        </span>
                        )
                      </>
                    )}
                    {descAfterUser}
                  </p>

                  <div className="relative rounded-xl border border-surface-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                    <input
                      type="text"
                      placeholder=" "
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={30}
                      disabled={isLoading}
                      className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none transition-all"
                    />
                    <label className="absolute left-3 top-4 text-sm text-foreground-60 transition-all pointer-events-none px-1 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background">
                      {t("MessagesPage.nickname_placeholder")}
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
                  {t("MessagesPage.assign_nickname_success")}
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
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                >
                  {t("MessagesPage.cancel")}
                </Button>
                <Button
                  form="assign-nickname-form"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : t("MessagesPage.save_nickname")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
