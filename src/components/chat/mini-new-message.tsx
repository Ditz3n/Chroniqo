// src/components/chat/mini-new-message.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollBar } from "@/components/ui/scroll-area";
import { useConversations } from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { MOOD_RING_FALLBACK } from "@/lib/utils/mood-ring";
import {
  ApiConversation,
  MiniNewMessageProps,
  SearchUser,
} from "@/types/app-types";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { Check, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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

export function MiniNewMessage({ onStartChat }: MiniNewMessageProps) {
  const { t } = useTranslation();
  const { data: convData } = useConversations();
  const conversations: ApiConversation[] = convData?.conversations || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [durationHours, setDurationHours] = useState<24 | 48 | 72>(24);
  const [isCreating, setIsCreating] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const toggleUser = (user: SearchUser) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        }
      } catch (err) {
        console.error("Failed to search users", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChat = async () => {
    if (selectedUsers.length === 0) return;
    setIsCreating(true);

    // 1:1 Chat Check
    if (selectedUsers.length === 1) {
      const user = selectedUsers[0];
      const existing = conversations.find(
        (c: ApiConversation) =>
          c.participants.length === 2 &&
          c.participants.some((p) => p.user.id === user.id),
      );
      if (existing) {
        onStartChat(existing.id);
        setIsCreating(false);
        return; // Exit early
      }
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: selectedUsers.map((u) => u.id),
          durationHours,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onStartChat(data.conversation.id);
      }
    } catch (err) {
      console.error("Failed to create chat", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border bg-surface">
        <span className="font-semibold text-sm text-foreground-60">
          {t("FloatingChat.to")}
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("FloatingChat.search")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-40 text-foreground font-medium"
          autoFocus
        />
      </div>

      {/* User List */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <ScrollAreaPrimitive.Root className="group/scrollarea flex-1 overflow-hidden relative">
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: "100%" }}
            data={users}
            components={{ Scroller: VirtuosoScroller }}
            itemContent={(_index, user) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className="flex cursor-pointer items-center justify-between p-2 hover:bg-foreground/5 transition-colors"
                >
                  <div className="flex items-center gap-3 px-2">
                    <Avatar
                      className="h-10 w-10 border border-surface-border ring-2 ring-offset-1 ring-offset-background"
                      style={
                        {
                          "--tw-ring-color": MOOD_RING_FALLBACK,
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
                        <AvatarFallback className="bg-surface text-foreground font-semibold">
                          {user.username?.[0]?.toUpperCase() ||
                            user.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                        {user.name || user.username}
                        {user.emailVerified && (
                          <VerifiedBadge className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="text-xs text-foreground-60">
                        u/{user.username}
                      </span>
                    </div>
                  </div>

                  {/* Selection Circle */}
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 mx-2 transition-all duration-200",
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-surface-border bg-transparent",
                    )}
                  >
                    {isSelected && (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    )}
                  </div>
                </div>
              );
            }}
          />
          <ScrollBar orientation="vertical" />
        </ScrollAreaPrimitive.Root>
      </div>

      {/* Footer */}
      <div className="flex flex-col bg-surface border-t border-surface-border p-2 z-20">
        {selectedUsers.length > 0 && (
          <div className="px-2">
            <div className="flex flex-wrap gap-1.5 bg-background rounded-xl px-3 py-2.5 border border-surface-border mb-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1 bg-surface rounded-full px-2 py-0.5"
                >
                  <Avatar className="h-4 w-4 border border-surface-border flex-shrink-0">
                    {user.image && <AvatarImage src={user.image} />}
                    {!user.image && user.avatarBgColor ? (
                      <IconAvatar
                        emoji={user.avatarEmoji}
                        bgColor={user.avatarBgColor}
                      />
                    ) : (
                      <AvatarFallback className="text-[8px] bg-surface text-foreground font-bold">
                        {user.username?.[0]?.toUpperCase() ||
                          user.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
                    {user.username || user.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleUser(user);
                    }}
                    className="text-foreground-40 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duration Selection */}
        <div className="px-2 pb-2 pt-1 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-foreground-40 uppercase tracking-wider">
            {t("MessagesPage.chat_duration")}
          </span>
          <div className="flex gap-1.5">
            {([24, 48, 72] as const).map((h) => (
              <button
                key={h}
                onClick={() => setDurationHours(h)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer",
                  durationHours === h
                    ? "bg-brand text-white border-brand"
                    : "bg-background border-surface-border text-foreground-60 hover:text-foreground",
                )}
              >
                {t(`MessagesPage.duration_${h}h`)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2 pb-2">
          <Button
            className="w-full cursor-pointer font-bold"
            disabled={selectedUsers.length === 0 || isCreating}
            onClick={handleChat}
          >
            {isCreating ? "..." : t("FloatingChat.chat")}
          </Button>
        </div>
      </div>
    </div>
  );
}
