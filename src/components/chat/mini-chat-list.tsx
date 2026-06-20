// src/components/chat/mini-chat-list.tsx
"use client";

import { ChatAvatar } from "@/components/ui/avatar";
import { ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { useConversations } from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getChatDisplayName } from "@/lib/utils/chat-helpers";
import {
  resolveChatSystemMessage,
  resolveGameMessagePreview,
} from "@/lib/utils/i18n-payload";
import { timeAgo } from "@/lib/utils/time";
import {
  ApiConversation,
  MiniChatLastMessage,
  MiniChatListProps,
} from "@/types/app-types";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { BellOff, Gamepad2, SquarePen } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useRef } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { VerifiedBadge } from "../ui/verified-badge";

// Plugs Virtuoso's scroller into Radix ScrollArea viewport so the
// custom styled scrollbar is used instead of the native one.
const VirtuosoScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <ScrollAreaPrimitive.Viewport
    {...props}
    ref={ref as React.ForwardedRef<HTMLDivElement>}
    className="h-full w-full rounded-[inherit] [&>div]:!block"
  />
));
VirtuosoScroller.displayName = "VirtuosoScroller";

export function MiniChatList({
  onSelectChat,
  onNewMessage,
}: MiniChatListProps) {
  const { t } = useTranslation();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { data, isLoading } = useConversations();
  const { data: session } = useSession();

  // Include personal chats + community chats where the user has joined,
  // sorted by most recent activity.
  const conversations = [
    ...(data?.conversations || []),
    ...(data?.communityConversations || []).filter((c: ApiConversation) =>
      c.participants.some((p) => p.user.id === session?.user?.id),
    ),
  ]
    .sort(
      (a: ApiConversation, b: ApiConversation) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    // Exclude chats where the user's status is still PENDING
    .filter((c: ApiConversation) => {
      const myParticipant = c.participants.find(
        (p) => p.user.id === session?.user?.id,
      );
      return myParticipant?.status !== "PENDING";
    });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <ScrollAreaPrimitive.Root className="group/scrollarea flex-1 overflow-hidden relative">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground-40 p-6 text-center">
            <p className="text-sm">{t("MessagesPage.no_conversations")}</p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: "100%" }}
            data={conversations}
            components={{ Scroller: VirtuosoScroller }}
            itemContent={(_index, chat: ApiConversation) => {
              const otherParticipants = chat.participants.filter(
                (p) => p.user.id !== session?.user?.id,
              );
              const chatName = getChatDisplayName(chat, session?.user?.id);

              const lastMessage: MiniChatLastMessage | undefined =
                chat.messages?.[0];
              const isSystemBrand =
                lastMessage?.messageType === "DELETION_SCHEDULED" ||
                lastMessage?.messageType === "DELETION_CANCELED";

              const myParticipant = chat.participants.find(
                (p) => p.user.id === session?.user?.id,
              );
              const isMuted = myParticipant?.isMuted;
              const unreadCount = (chat as ApiConversation).unreadCount || 0;
              const hasUnread = unreadCount > 0;

              // Exclude chats where the user's status is still PENDING
              let previewText = lastMessage?.content;
              if (
                lastMessage?.isSystem &&
                lastMessage.messageType?.startsWith("GAME_")
              ) {
                previewText = resolveGameMessagePreview(
                  lastMessage.content,
                  lastMessage.messageType,
                  t,
                );
              } else if (lastMessage?.isSystem) {
                previewText = resolveChatSystemMessage(
                  lastMessage.content,
                  lastMessage.messageType,
                  lastMessage.sender?.name ||
                    lastMessage.sender?.username ||
                    "Unknown",
                  t,
                );
              } else if (lastMessage?.deletedAt) {
                previewText = t("MessagesPage.message_deleted");
              } else if (lastMessage?.content && lastMessage?.sender) {
                const senderHandle =
                  lastMessage.sender.username || lastMessage.sender.name;
                previewText = `u/${senderHandle}: ${lastMessage.content}`;
              }

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
                >
                  <ChatAvatar
                    participants={
                      chat.isCommunity
                        ? []
                        : chat.participants.length > 2
                          ? chat.participants
                          : otherParticipants
                    }
                    chatImage={chat.image}
                    className="h-12 w-12 flex-shrink-0"
                    ringParticipants={chat.isCommunity ? [] : chat.participants}
                    avatarEmoji={chat.avatarEmoji}
                    avatarBgColor={chat.avatarBgColor}
                    name={chat.isCommunity ? chatName : undefined}
                  />
                  <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                    <div className="flex items-center justify-between min-w-0 gap-2">
                      <span
                        className={cn(
                          "text-sm truncate flex items-center gap-1",
                          hasUnread
                            ? "font-bold text-foreground"
                            : "font-semibold text-foreground-80",
                        )}
                      >
                        {chatName}
                        {!chat.isCommunity &&
                          otherParticipants.length === 1 &&
                          otherParticipants[0].user.emailVerified && (
                            <VerifiedBadge className="h-3.5 w-3.5" />
                          )}
                      </span>
                      {isMuted ? (
                        <BellOff className="h-3 w-3 text-foreground-40 flex-shrink-0" />
                      ) : (
                        hasUnread && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white flex-shrink-0">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs min-w-0 mt-0.5">
                      {lastMessage?.messageType?.startsWith("GAME_") && (
                        <Gamepad2 className="h-3 w-3 text-foreground-40 flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          "truncate min-w-0",
                          isSystemBrand
                            ? "text-brand font-semibold"
                            : hasUnread
                              ? "text-foreground font-medium"
                              : "text-foreground-60",
                        )}
                      >
                        {previewText || t("MessagesPage.new_conversation")}
                      </span>
                      <span className="flex-shrink-0 whitespace-nowrap text-foreground-60">
                        · {timeAgo(chat.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
        <ScrollBar orientation="vertical" className="z-50" />
      </ScrollAreaPrimitive.Root>

      <Tooltip content={t("FloatingChat.newMessage")} side="left">
        <button
          onClick={onNewMessage}
          aria-label={t("FloatingChat.newMessage")}
          className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand shadow-lg transition-transform hover:scale-110 cursor-pointer"
        >
          <SquarePen className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
    </div>
  );
}
