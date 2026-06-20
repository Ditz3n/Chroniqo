// src/app/[locale]/(protected)/create/(components)/drafts-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/hooks/use-translation";
import { timeAgo } from "@/lib/utils/time";
import { ApiPostDraft, DraftsModalProps } from "@/types/app-types";
import { Trash2 } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DraftsModal({
  isOpen,
  onClose,
  onSelectDraft,
}: DraftsModalProps) {
  const { t } = useTranslation();
  const { data, mutate, isLoading } = useSWR("/api/drafts", fetcher, {
    revalidateOnFocus: false,
  });

  const drafts = data?.drafts || [];

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (res.ok) {
        mutate(); // refresh list
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 bg-surface border-b border-surface-border">
          <DialogTitle>{t("createPost.drafts_modal_title")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-0">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-foreground-40 text-sm font-medium">
              {t("createPost.drafts_empty")}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="flex flex-col">
                {drafts.map((draft: ApiPostDraft) => (
                  <div
                    key={draft.id}
                    onClick={() => {
                      onSelectDraft(draft);
                      onClose();
                    }}
                    className="flex items-center justify-between p-4 border-b border-surface-border hover:bg-foreground/5 cursor-pointer transition-colors group"
                  >
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="font-bold text-foreground truncate">
                        {draft.title || "Untitled Draft"}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-xs text-foreground-60">
                        {draft.communityId && draft.community ? (
                          <span className="font-semibold text-brand">
                            c/{draft.community.name}
                          </span>
                        ) : (
                          <span className="font-semibold text-brand">
                            {t("createPost.your_profile")}
                          </span>
                        )}
                        <span>•</span>
                        <span>{timeAgo(draft.updatedAt)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={(e) => handleDelete(e, draft.id)}
                      className="text-foreground-40 hover:text-brand hover:bg-brand/10 p-2 h-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
