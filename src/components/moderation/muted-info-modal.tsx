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
import { MicOff } from "lucide-react";

export function MutedInfoModal({
  isOpen,
  onClose,
  reason,
  mutedUntil,
}: {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
  mutedUntil?: string | null;
}) {
  const { t, locale } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <DialogTitle className="font-bold text-warning flex items-center gap-2">
            <MicOff className="h-5 w-5" />
            {t("admin.muted_info_title")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="p-6 flex flex-col gap-4">
          <p className="text-sm text-foreground-60">
            {t("admin.muted_info_desc")}
          </p>

          <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface border border-surface-border">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground-40 uppercase tracking-wider">
                {t("admin.muted_reason")}
              </span>
              <span className="text-sm font-medium text-foreground mt-1">
                {reason || t("admin.no_reason")}
              </span>
            </div>

            <div className="flex flex-col mt-2 pt-2 border-t border-surface-border">
              <span className="text-xs font-bold text-foreground-40 uppercase tracking-wider">
                {t("admin.muted_until")}
              </span>
              <span className="text-sm font-medium text-foreground mt-1">
                {mutedUntil
                  ? new Date(mutedUntil).toLocaleString(locale)
                  : t("admin.infinite")}
              </span>
            </div>
          </div>
        </DialogBody>

        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-surface-border bg-surface">
          <Button variant="outline" onClick={onClose}>
            {t("communityPage.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
