// src/app/[locale]/(protected)/u/[username]/friends/(components)/friend-card.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { FriendCardProps } from "@/types/app-types";
import { Check, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function FriendCard({
  user,
  isOwnProfile,
  override,
  onRemove,
  onReAdd,
  onCancelRequest,
}: FriendCardProps) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);

  const state = (override === "accepted" ? "friends" : override) ?? "friends";

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username || state === "pending" || loading) return;
    setLoading(true);
    try {
      if (state === "friends") await onRemove(user.username);
      else await onReAdd(user.username);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username || loading) return;
    setLoading(true);
    try {
      await onCancelRequest(user.username);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href={`/${locale}/u/${user.username}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 border-b border-surface-border transition-colors bg-surface sm:rounded-2xl sm:border sm:mb-3 last:border-b-0 sm:last:border-b cursor-pointer"
    >
      <Avatar
        className="h-10 w-10 border border-surface-border ring-2 ring-offset-1 ring-offset-background bg-background"
        style={
          {
            "--tw-ring-color": getMoodRingColor(user.dailyStatuses?.[0]?.value),
          } as React.CSSProperties
        }
      >
        {user.image && <AvatarImage src={user.image} />}
        {!user.image && user.avatarBgColor ? (
          <IconAvatar
            emoji={user.avatarEmoji}
            bgColor={user.avatarBgColor}
            emojiSizeClass="text-2xl"
          />
        ) : (
          <AvatarFallback className="text-xs font-bold text-brand bg-brand/20">
            {user.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
          {user.name ?? user.username}
          {user.emailVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs text-foreground-60 truncate">
          u/{user.username}
        </span>
      </div>

      {isOwnProfile && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {state !== "pending" && (
            <button
              onClick={handleAction}
              disabled={loading}
              className="text-xs font-semibold transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5 hover:opacity-60"
            >
              {loading ? (
                <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : state === "friends" ? (
                <span className="text-brand flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("profile.friends")}
                  </span>
                </span>
              ) : (
                <span className="text-foreground-60 flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("profile.add_friend")}
                  </span>
                </span>
              )}
            </button>
          )}

          {state === "pending" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground-40 italic hidden sm:inline">
                {t("profile.pending")}
              </span>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="text-xs font-semibold text-foreground-60 hover:opacity-60 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {t("profile.cancel")}
              </button>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
