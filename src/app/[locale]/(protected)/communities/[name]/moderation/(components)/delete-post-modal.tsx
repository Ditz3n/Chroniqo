// src/app/[locale]/(protected)/communities/[name]/moderation/(components)/delete-post-modal.tsx
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
import { DeletePostModalProps } from "@/types/app-types";

export function DeletePostModal({
  isOpen,
  onOpenChange,
  postTitle,
  deleteReason,
  onDeleteReasonChange,
  onSubmit,
  loadingAction,
}: DeletePostModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="bg-background p-0 overflow-hidden gap-0 sm:max-w-md">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold">
            {t("communityPage.delete_post_title").replace(
              "{{title}}",
              postTitle || "",
            )}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <p className="text-sm text-foreground-60">
              {t("communityPage.delete_post_desc")}
            </p>

            <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
              <textarea
                id="delete-reason"
                rows={4}
                placeholder=" "
                value={deleteReason}
                onChange={(e) => onDeleteReasonChange(e.target.value)}
                disabled={!!loadingAction}
                className="peer w-full px-4 pt-6 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all resize-none text-sm"
              />
              <label
                htmlFor="delete-reason"
                className="absolute left-3 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
              >
                {t("communityPage.delete_post_reason_label")}
              </label>
            </div>

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
                  ? t("communityPage.deleting_post")
                  : t("communityPage.confirm_delete_post")}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
