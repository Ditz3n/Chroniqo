// src/app/[locale]/(protected)/messages/(components)/join-community-chat-modal.tsx
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
import { EyeOff, Ghost, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface JoinCommunityChatModalProps {
  isOpen: boolean;
  communityName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function JoinCommunityChatModal({
  isOpen,
  communityName,
  onClose,
  onConfirm,
}: JoinCommunityChatModalProps) {
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

  const handleConfirm = async () => {
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
      }, 1900);
    } catch {
      setIsLoading(false);
      setIsTransitioning(false);
    }
  };

  const rules = [
    {
      icon: <Ghost className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />,
      text: t("MessagesPage.join_chat_rule_anonymous"),
    },
    {
      icon: <ShieldCheck className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />,
      text: t("MessagesPage.join_chat_rule_admins_see"),
    },
    {
      icon: <EyeOff className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />,
      text: t("MessagesPage.join_chat_rule_toggle"),
    },
  ];

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden overflow-x-hidden gap-0 bg-background border-surface-border [&>button]:hidden">
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand/10 flex-shrink-0">
              <Ghost className="h-5 w-5 text-brand" />
            </div>
            <div className="flex flex-col text-left">
              <DialogTitle className="font-bold text-foreground leading-tight">
                {t("MessagesPage.join_community_chat_modal_title")}
              </DialogTitle>
              <span className="text-sm text-foreground-60 font-medium">
                c/{communityName}
              </span>
            </div>
          </div>
        </DialogHeader>

        <DialogBody style={{ overflowY: "hidden", overflowX: "hidden" }}>
          {/* Main Content */}
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
                <div className="flex flex-col gap-3">
                  {rules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-surface-border"
                    >
                      {rule.icon}
                      <p className="text-sm text-foreground-60 leading-relaxed font-medium">
                        {rule.text}
                      </p>
                    </div>
                  ))}
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
                className="flex flex-col items-center justify-center pt-8 pb-10 gap-4"
                style={{
                  opacity: successOpacity,
                  transition: "opacity 300ms ease-in-out",
                }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 mb-2">
                  <ShieldCheck className="h-6 w-6 text-brand" />
                </div>
                <p className="text-foreground font-bold text-lg text-center px-6">
                  {t("MessagesPage.join_community_chat_success")}
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
                  onClick={handleClose}
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                  disabled={isLoading}
                >
                  {t("MessagesPage.cancel")}
                </Button>
                <Button onClick={handleConfirm} disabled={isLoading}>
                  {isLoading ? "..." : t("MessagesPage.join_community_chat")}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
