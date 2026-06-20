// src/app/[locale]/(protected)/u/[username]/friends/(components)/blocked-card.tsx
"use client";

import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { FriendUser } from "@/types/app-types";
import { Unlock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserAvatar } from "./user-avatar";

interface BlockedCardProps {
  user: FriendUser;
  onUnblock: (username: string) => Promise<void>;
}

export function BlockedCard({ user, onUnblock }: BlockedCardProps) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleUnblock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username || loading) return;
    setLoading(true);
    try {
      await onUnblock(user.username);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      href={`/${locale}/u/${user.username}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 border-b border-surface-border transition-colors bg-surface sm:rounded-2xl sm:border sm:mb-3 last:border-b-0 sm:last:border-b cursor-pointer"
    >
      <UserAvatar user={user} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
          {user.name ?? user.username}
          {user.emailVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs text-foreground-60 truncate">
          u/{user.username}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleUnblock}
          disabled={loading}
          className="text-xs font-semibold text-brand hover:opacity-60 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {loading ? (
            <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Unlock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("profile.unblock")}</span>
            </>
          )}
        </button>
      </div>
    </Link>
  );
}
