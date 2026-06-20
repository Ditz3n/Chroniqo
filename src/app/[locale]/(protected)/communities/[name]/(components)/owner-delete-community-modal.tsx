// src/app/[locale]/(protected)/communities/[name]/(components)/owner-delete-community-modal.tsx
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
import { useEffect, useRef, useState } from "react";

interface OwnerDeleteCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  onSuccessComplete?: () => void;
}

export function OwnerDeleteCommunityModal({
  isOpen,
  onClose,
  communityName,
  onSuccessComplete,
}: OwnerDeleteCommunityModalProps) {
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

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
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
      } else {
        setIsLoading(false);
        console.error("Failed to delete community");
      }
    } catch (err) {
      console.error(err);
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
        !open && !isLoading && !isTransitioning && handleClose()
      }
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold text-foreground">
            {t("communityPage.delete_community_title").replace(
              "{{community}}",
              `c/${communityName}`,
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
                  {t("communityPage.delete_community_desc_1")}{" "}
                  <span className="text-foreground font-semibold">
                    c/{communityName}
                  </span>
                  {t("communityPage.delete_community_desc_2")}{" "}
                  <span className="text-foreground font-semibold">
                    {t("communityPage.posts_word")}
                  </span>
                  {t("communityPage.delete_community_desc_3")}{" "}
                  <span className="text-foreground font-semibold">
                    {t("communityPage.comments_word")}
                  </span>
                  {t("communityPage.delete_community_desc_4")}
                  <span className="text-foreground font-semibold">
                    {t("communityPage.members_word")}
                  </span>
                  {t("communityPage.delete_community_desc_5")}
                </div>
              </div>
            </div>
          </div>

          {/* Success Message */}
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
                  {t("communityPage.delete_community_success").replace(
                    "{{community}}",
                    `c/${communityName}`,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
                  {t("communityPage.delete_community_cancel")}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    t("communityPage.delete_community_confirm")
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
