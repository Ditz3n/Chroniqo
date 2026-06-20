// src/app/[locale]/(protected)/u/[username]/friends/(components)/sent-request-card.tsx
"use client";

import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { SentRequestCardProps } from "@/types/app-types";
import { Check, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserAvatar } from "./user-avatar";

export function SentRequestCard({
  user,
  override,
  onCancel,
  onReAdd,
  onRemove,
}: SentRequestCardProps) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);

  const state = override ?? "pending";

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username) return;
    setLoading(true);
    try {
      await onCancel(user.username);
    } finally {
      setLoading(false);
    }
  };

  const handleReAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username) return;
    setLoading(true);
    try {
      await onReAdd(user.username);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username) return;
    setLoading(true);
    try {
      await onRemove(user.username);
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
        {state === "accepted" ? (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="text-brand hover:opacity-60 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            {loading ? (
              <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("profile.friends")}</span>
              </>
            )}
          </button>
        ) : state === "pending" ? (
          <>
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
          </>
        ) : (
          <button
            onClick={handleReAdd}
            disabled={loading}
            className="text-xs font-semibold text-foreground-60 hover:opacity-60 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {loading ? (
              <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("profile.add_friend")}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </Link>
  );
}
