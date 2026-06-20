// src/components/ui/reaction-modal.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/hooks/use-translation";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { ReactionUser } from "@/types/app-types";
import { useSession } from "next-auth/react";

interface ReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: { emoji: string; users: ReactionUser[] }[];
  onRemove: (emoji: string) => void;
}

export function ReactionModal({
  isOpen,
  onClose,
  reactions,
  onRemove,
}: ReactionModalProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Calculate rough height constraint based on items
  const totalUsers = reactions.reduce((sum, r) => sum + r.users.length, 0);
  const contentHeight = totalUsers * 68 + reactions.length * 10;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader className="rounded-t-xl bg-surface-opaque">
          <DialogTitle>{t("MessagesPage.reactions")}</DialogTitle>
        </DialogHeader>

        <ScrollArea
          className="w-full"
          style={{
            height: `min(calc(100vh - 14rem), ${Math.max(contentHeight, 150)}px)`,
          }}
        >
          <div className="flex flex-col pb-2">
            {reactions.map((reactionGroup) => (
              <div key={reactionGroup.emoji} className="flex flex-col">
                {reactionGroup.users.map((user) => {
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <div
                      key={`${reactionGroup.emoji}-${user.id}`}
                      onClick={() => {
                        if (isCurrentUser) onRemove(reactionGroup.emoji);
                      }}
                      className={`flex items-center justify-between py-3 px-6 transition-colors group h-[68px] ${
                        isCurrentUser
                          ? "cursor-pointer hover:bg-foreground/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 h-full">
                        <Avatar
                          className="h-11 w-11 border-2 border-surface-border bg-background ring-2 ring-offset-2 ring-offset-background"
                          style={
                            {
                              "--tw-ring-color": getMoodRingColor(
                                user.dailyStatusValue ?? null,
                              ),
                            } as React.CSSProperties
                          }
                        >
                          {user.image && <AvatarImage src={user.image} />}
                          {!user.image && user.avatarBgColor ? (
                            <IconAvatar
                              emoji={user.avatarEmoji}
                              bgColor={user.avatarBgColor}
                            />
                          ) : (
                            <AvatarFallback>
                              {user.fullName?.[0] || user.name[0].toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col justify-center h-full">
                          <span className="font-semibold text-sm text-foreground">
                            {user.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-foreground-60">
                              {t("MessagesPage.select_to_remove")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative text-xl h-8 w-8 transition-transform group-hover:scale-110 select-none">
                        {/* Span is needed to properly center the emoji icons */}
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 0,
                            transform: "translateY(-2px)",
                          }}
                        >
                          {reactionGroup.emoji}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
