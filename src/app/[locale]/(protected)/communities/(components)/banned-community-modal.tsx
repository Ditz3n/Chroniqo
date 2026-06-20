// src/app/[locale]/(protected)/communities/(components)/banned-community-modal.tsx
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
import { BannedCommunityModalProps } from "@/types/app-types";
import { AlertTriangle } from "lucide-react";

export function BannedCommunityModal({
  isOpen,
  onClose,
  communityName,
  reason,
  expires,
}: BannedCommunityModalProps) {
  const { t, locale } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <DialogTitle className="font-bold text-foreground">
            {t("communitiesPage.banned_title_overview").replace(
              "{{name}}",
              `c/${communityName}`,
            )}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="p-6 flex flex-col gap-4 bg-background">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-brand/10 border border-brand/20">
            <AlertTriangle className="h-5 w-5 text-brand shrink-0" />
            <p className="text-xs font-semibold text-brand/90 leading-relaxed">
              {t("communitiesPage.banned_desc")}
            </p>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface border border-surface-border">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground-40 uppercase tracking-wider">
                {t("communitiesPage.banned_reason_label")}
              </span>
              <span className="text-sm font-medium text-foreground mt-1">
                {reason || t("communitiesPage.banned_reason_default")}
              </span>
            </div>

            <div className="flex flex-col mt-2 pt-2 border-t border-surface-border">
              <span className="text-xs font-bold text-foreground-40 uppercase tracking-wider">
                {t("communitiesPage.banned_expires_label")}
              </span>
              <span className="text-sm font-medium text-foreground mt-1">
                {expires
                  ? new Date(expires).toLocaleString(locale)
                  : t("communitiesPage.banned_expires_permanent")}
              </span>
            </div>
          </div>
        </DialogBody>

        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-surface-border bg-surface">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="text-foreground-60 hover:text-foreground hover:bg-transparent"
          >
            {t("communitiesPage.banned_close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
