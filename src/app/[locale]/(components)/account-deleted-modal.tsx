// src/app/[locale]/(components)/account-deleted-modal.tsx
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
import { AccountDeletedModalProps } from "@/types/app-types";
import { CheckCircle2 } from "lucide-react";

export function AccountDeletedModal({
  isOpen,
  onClose,
}: AccountDeletedModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border">
        <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
          <DialogTitle className="font-bold text-foreground">
            {t("loginPage.account_deleted_title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="pt-5 px-6 pb-6 flex flex-col gap-5">
          {/* Info box */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-feedback-success/10 border border-feedback-success/20">
            <CheckCircle2 className="h-5 w-5 text-feedback-success shrink-0" />
            <p className="text-xs font-semibold text-feedback-success leading-relaxed">
              {t("loginPage.account_deleted_desc")}
            </p>
          </div>

          {/* Detail text */}
          <p className="text-sm text-foreground-60 leading-relaxed">
            {t("loginPage.account_deleted_detail")}
          </p>

          {/* Button row */}
          <div className="flex items-center justify-end -mx-6 -mb-6 px-6 py-4 border-t border-surface-border bg-surface">
            <Button variant="brand" type="button" onClick={onClose}>
              {t("loginPage.account_deleted_close")}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
