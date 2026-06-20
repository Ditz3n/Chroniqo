// src/app/[locale]/(components)/banned-user-modal.tsx
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
import { BannedUserModalProps } from "@/types/app-types";
import { AlertTriangle } from "lucide-react";

export function BannedUserModal({
  isOpen,
  onClose,
  onDelete,
  isDeleting,
  reason,
  expires,
  dataAlreadyDeleted = false,
}: BannedUserModalProps) {
  const { t, locale } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <DialogTitle className="font-bold text-foreground">
            {t("loginPage.banned_title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="pt-5 px-6 pb-6 flex flex-col gap-5">
          {/* Warning box */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-brand/10 border border-brand/20">
            <AlertTriangle className="h-5 w-5 text-brand shrink-0" />
            <p className="text-xs font-semibold text-brand/90 leading-relaxed">
              {t("loginPage.banned_desc")}
            </p>
          </div>

          {/* Reason & Expires section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-foreground-40">
                {t("loginPage.banned_reason_label")}
              </span>
            </div>
            <div className="rounded-xl border border-surface-border overflow-hidden bg-surface/40">
              <div className="flex flex-col p-4 gap-2">
                <span className="text-sm font-medium text-foreground">
                  {reason || t("loginPage.banned_reason_default")}
                </span>
                <div className="flex flex-col mt-2 pt-2 border-t border-surface-border">
                  <span className="text-xs font-bold text-foreground-40 uppercase tracking-wider">
                    {t("loginPage.banned_expires_label")}
                  </span>
                  <span className="text-sm font-medium text-foreground mt-1">
                    {expires
                      ? new Date(expires).toLocaleString(locale)
                      : t("loginPage.banned_expires_permanent")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info text */}
          <p className="text-xs text-foreground-60 mt-2">
            {t("loginPage.banned_delete_info")}
          </p>

          {/* Button row */}
          <div className="flex items-center justify-end gap-3 -mx-6 -mb-6 px-6 py-4 border-t border-surface-border bg-surface">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="text-foreground-60 hover:text-foreground hover:bg-transparent"
            >
              {t("loginPage.banned_close")}
            </Button>
            <Button
              type="button"
              onClick={onDelete}
              disabled={isDeleting || dataAlreadyDeleted}
              title={
                dataAlreadyDeleted
                  ? t("loginPage.banned_already_deleted")
                  : undefined
              }
              variant="brand"
            >
              {isDeleting
                ? t("auth.loading_dots")
                : dataAlreadyDeleted
                  ? t("loginPage.banned_already_deleted")
                  : t("loginPage.banned_delete_btn")}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
