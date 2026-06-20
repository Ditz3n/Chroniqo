// src/components/ui/role-badge.tsx
"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { RoleBadgeProps } from "@/types/app-types";
import { Crown, Ghost, ShieldCheck, Smile, SmilePlus } from "lucide-react";

export function RoleBadge({
  globalRole,
  communityRole,
  isAnonymousAuthor,
}: RoleBadgeProps) {
  const { t } = useTranslation();

  const showSystemAdmin = globalRole === "ADMIN";
  const showOwner = communityRole === "OWNER";
  const showCommunityAdmin = communityRole === "ADMIN";
  const showModerator = communityRole === "MODERATOR";

  if (
    !showSystemAdmin &&
    !showOwner &&
    !showCommunityAdmin &&
    !showModerator &&
    !isAnonymousAuthor
  ) {
    return null;
  }

  return (
    <span className="flex items-center gap-0.5">
      {showSystemAdmin && (
        <Tooltip content={t("roleBadge.system_admin")} side="top">
          <span className="inline-flex items-center">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          </span>
        </Tooltip>
      )}
      {showOwner && (
        <Tooltip content={t("roleBadge.owner")} side="top">
          <span className="inline-flex items-center">
            <Crown className="h-3.5 w-3.5 text-[var(--color-dailystatus-good-periods)]" />
          </span>
        </Tooltip>
      )}
      {showCommunityAdmin && (
        <Tooltip content={t("roleBadge.admin")} side="top">
          <span className="inline-flex items-center">
            <SmilePlus className="h-3.5 w-3.5 text-[var(--color-dailystatus-full-energy)]" />
          </span>
        </Tooltip>
      )}
      {showModerator && (
        <Tooltip content={t("roleBadge.moderator")} side="top">
          <span className="inline-flex items-center">
            <Smile className="h-3.5 w-3.5 text-[var(--color-dailystatus-low-energy)]" />
          </span>
        </Tooltip>
      )}
      {isAnonymousAuthor && (
        <Tooltip content={t("roleBadge.anonymous_post")} side="top">
          <span className="inline-flex items-center">
            <Ghost className="h-3.5 w-3.5 text-[var(--color-dailystatus-exhausted)]" />
          </span>
        </Tooltip>
      )}
    </span>
  );
}
