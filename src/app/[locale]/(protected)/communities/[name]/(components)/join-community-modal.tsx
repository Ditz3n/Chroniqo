// src/app/[locale]/(protected)/communities/[name]/(components)/join-community-modal.tsx
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
import { Info, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface JoinCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  communityName: string;
  communityRules?: string[];
  isPrivate?: boolean;
  isLoading: boolean;
  onRequestClose?: () => void;
}

export function JoinCommunityModal({
  isOpen,
  onClose,
  onConfirm,
  communityName,
  communityRules,
  isPrivate = false,
  isLoading,
  onRequestClose,
}: JoinCommunityModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayTarget = `c/${communityName}`;

  const resetState = () => {
    setPhase("idle");
    setSuccessOpacity(0);
    setIsTransitioning(false);
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

  const handleConfirm = () => {
    onConfirm();
    setIsTransitioning(true);
    setPhase("success");

    successTimeoutRef.current = setTimeout(() => {
      setSuccessOpacity(1);
    }, 300);

    closeTimeoutRef.current = setTimeout(() => {
      if (onRequestClose) {
        onRequestClose();
      } else {
        onClose();
      }
      resetState();
    }, 1900);
  };

  const show = phase === "idle";

  const gridInnerStyle: React.CSSProperties = {
    overflow: "clip",
    minHeight: 0,
  };

  const resolvedRules =
    communityRules?.filter((rule) => rule.trim().length > 0) ?? [];

  const fallbackRules = [
    t("communityPage.rule_1"),
    t("communityPage.rule_2"),
    t("communityPage.rule_3"),
  ];

  const rulesToShow = resolvedRules.length > 0 ? resolvedRules : fallbackRules;

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
            {t("communityPage.join_modal_title").replace(
              "{{name}}",
              displayTarget,
            )}
          </DialogTitle>
        </DialogHeader>

        <DialogBody style={{ overflowY: "hidden" }}>
          {/* Content */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridInnerStyle}>
              <div
                className="px-4 pt-4 pb-8 flex flex-col gap-6"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                {/* Rules Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="h-5 w-5 text-foreground-40" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground-40">
                      {t("communityPage.rules")}
                    </h3>
                  </div>
                  {rulesToShow.map((rule, index) => (
                    <div
                      key={`${index}-${rule}`}
                      className={
                        index < rulesToShow.length - 1
                          ? "text-sm font-medium text-foreground-60 border-b border-surface-border/50 pb-2"
                          : "text-sm font-medium text-foreground-60"
                      }
                    >
                      {index + 1}. {rule}
                    </div>
                  ))}
                </div>

                {/* Anonymity Warning */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/10 border border-brand/20">
                  <Info className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-brand/90 leading-relaxed">
                    {t("communityPage.anonymity_warning")}
                  </p>
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
                  {isPrivate
                    ? t("communityPage.join_request_sent_message").replace(
                        "{{target}}",
                        displayTarget,
                      )
                    : t("communityPage.join_success_message").replace(
                        "{{target}}",
                        displayTarget,
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
                  {t("communitiesPage.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  onClick={handleConfirm}
                  disabled={isLoading}
                >
                  {isPrivate
                    ? t("communityPage.join_request_btn")
                    : t("communityPage.join_confirm_btn")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
