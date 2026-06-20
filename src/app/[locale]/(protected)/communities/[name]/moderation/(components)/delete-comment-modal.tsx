// src/app/[locale]/(protected)/communities/[name]/moderation/(components)/delete-comment-modal.tsx
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
import { DeleteCommentModalProps } from "@/types/app-types";

export function DeleteCommentModal({
  isOpen,
  onOpenChange,
  onSubmit,
  loadingAction,
}: DeleteCommentModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="bg-background p-0 overflow-hidden gap-0 sm:max-w-md">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold">
            {t("communityPage.delete_comment_title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <p className="text-sm text-foreground-60">
              {t("communityPage.delete_comment_desc")}
            </p>
            <div className="flex items-center justify-end gap-3 mt-2 -mx-4 -mb-4 px-4 py-3 border-t border-surface-border bg-surface">
              <Button
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={!!loadingAction}
                className="text-foreground-60 hover:text-foreground hover:bg-transparent"
              >
                {t("communityPage.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!!loadingAction}
                className="bg-brand hover:bg-brand/90 text-white border-brand"
              >
                {loadingAction?.startsWith("del-")
                  ? t("communityPage.deleting_comment")
                  : t("communityPage.confirm_delete_comment")}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
