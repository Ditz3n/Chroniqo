// src/app/[locale]/(protected)/u/[username]/friends/(components)/request-card.tsx
"use client";

import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { RequestCardProps } from "@/types/app-types";
import Link from "next/link";
import { useState } from "react";
import { UserAvatar } from "./user-avatar";

export function RequestCard({
  requestId,
  user,
  onAccept,
  onDecline,
}: RequestCardProps) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const handle = async (e: React.MouseEvent, action: "accept" | "decline") => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(action);
    try {
      if (action === "accept") await onAccept(requestId);
      else await onDecline(requestId);
    } finally {
      setLoading(null);
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
          onClick={(e) => handle(e, "accept")}
          disabled={loading !== null}
          className="text-xs font-semibold text-brand hover:opacity-60 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {t("profile.accept")}
        </button>
        <button
          onClick={(e) => handle(e, "decline")}
          disabled={loading !== null}
          className="text-xs font-semibold text-foreground-60 hover:opacity-60 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {t("profile.decline")}
        </button>
      </div>
    </Link>
  );
}
