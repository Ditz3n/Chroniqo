// src/app/[locale]/(protected)/messages/(components)/new-chat-modal.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { MOOD_RING_FALLBACK } from "@/lib/utils/mood-ring";
import { NewChatModalProps, SearchUser } from "@/types/app-types";
import { Check, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function NewChatContent({
  isOpen,
  onClose,
  onStartChat,
  hideHeader = false,
  searchRowClassName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (users: SearchUser[], durationHours: 24 | 48 | 72) => void;
  hideHeader?: boolean;
  searchRowClassName?: string;
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [durationHours, setDurationHours] = useState<24 | 48 | 72>(24);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleUser = (user: SearchUser) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  // Reset transient state after close animation, and focus input after open animation.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setSearchQuery("");
        setUsers([]);
        setSelectedUsers([]);
        setDurationHours(24);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounce user search requests to avoid firing an API call on every keystroke.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Header - hidden when parent provides its own header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-4 bg-surface border-b border-surface-border flex-shrink-0">
          <div className="w-9" />
          <DialogTitle className="text-base font-bold text-foreground">
            {t("MessagesPage.newMessage")}
          </DialogTitle>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-foreground/5 text-foreground-60 hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search row */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-surface-border flex-shrink-0",
          searchRowClassName ?? "bg-surface",
        )}
      >
        <span className="text-sm font-bold text-foreground flex-shrink-0">
          {t("MessagesPage.to")}:
        </span>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-40 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("MessagesPage.searchUsers")}
            className="w-full bg-transparent pl-9 py-1.5 text-sm outline-none placeholder:text-foreground-40 text-foreground font-medium"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-foreground-40 hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto bg-background">
        {users.length === 0 && searchQuery === "" ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground-40 gap-3 py-16">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t("MessagesPage.searchToFind")}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-foreground-40">
            {t("MessagesPage.no_results")}
          </div>
        ) : (
          <div className="flex flex-col">
            {searchQuery === "" && (
              <p className="px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-foreground-40">
                {t("MessagesPage.suggested")}
              </p>
            )}
            {users.map((user) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-foreground/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-12 w-12 border border-surface-border flex-shrink-0 ring-2 ring-offset-1 ring-offset-background"
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
                        <AvatarFallback className="bg-surface text-foreground font-bold">
                          {user.username?.[0]?.toUpperCase() ||
                            user.name?.[0]?.toUpperCase() ||
                            "?"}
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
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 flex-shrink-0",
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-surface-border",
                    )}
                  >
                    {isSelected && (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-surface border-t border-surface-border flex-shrink-0 pb-12 md:pb-0">
        <div
          className="reply-preview"
          data-open={selectedUsers.length > 0 ? "true" : "false"}
        >
          <div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 bg-background rounded-xl mx-3 -mb-1 mt-4 px-4 py-2.5 border border-surface-border">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 bg-surface rounded-full px-2 py-1"
                  >
                    <Avatar className="h-5 w-5 border border-surface-border flex-shrink-0">
                      {user.image && <AvatarImage src={user.image} />}
                      {!user.image && user.avatarBgColor ? (
                        <IconAvatar
                          emoji={user.avatarEmoji}
                          bgColor={user.avatarBgColor}
                        />
                      ) : (
                        <AvatarFallback className="text-[10px] bg-surface text-foreground font-bold">
                          {user.username?.[0]?.toUpperCase() ||
                            user.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-xs font-medium text-foreground truncate">
                      {user.name || user.username}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUser(user);
                      }}
                      className="text-foreground-40 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-3 pt-3 pb-1 flex flex-col gap-2">
          <span className="text-xs font-bold text-foreground-40 uppercase tracking-wider">
            {t("MessagesPage.chat_duration")}
          </span>
          <div className="flex gap-2">
            {([24, 48, 72] as const).map((h) => (
              <button
                key={h}
                onClick={() => setDurationHours(h)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer",
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
        <div className="p-3 pt-2">
          <Button
            className="w-full font-bold cursor-pointer"
            disabled={selectedUsers.length === 0}
            onClick={() => {
              if (selectedUsers.length > 0) {
                onStartChat(selectedUsers, durationHours);
                onClose();
              }
            }}
          >
            {t("MessagesPage.chat")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Desktop-only dialog wrapper
export function NewChatModal({
  isOpen,
  onClose,
  onStartChat,
}: NewChatModalProps) {
  const isMobile = useIsMobile();

  // Keep desktop dialog behavior consistent by closing it when switching to mobile layout.
  useEffect(() => {
    if (isMobile && isOpen) onClose();
  }, [isMobile, isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden gap-0"
        style={{
          width: "560px",
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "85dvh",
          height: "600px",
        }}
      >
        <DialogTitle className="sr-only">New Message</DialogTitle>
        <NewChatContent
          isOpen={isOpen}
          onClose={onClose}
          onStartChat={onStartChat}
        />
      </DialogContent>
    </Dialog>
  );
}

// Mobile panel - rendered directly by MessagesSidebar, no Dialog context
export { NewChatContent };
