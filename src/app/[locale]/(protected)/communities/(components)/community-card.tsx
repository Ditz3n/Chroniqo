// src/app/[locale]/(protected)/communities/(components)/community-card.tsx
"use client";

import { SuspendedInfoModal } from "@/components/moderation/suspended-info-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CommunityCardProps } from "@/types/app-types";
import { Ban, Lock, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BannedCommunityModal } from "./banned-community-modal";

export function CommunityCard({ community, locale }: CommunityCardProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);
  const initials = community.name.substring(0, 2).toUpperCase();

  const isBanned = community.isBanned;
  const isBlocked = community.isBlockedByMe;
  const isSuspended = community.isActive === false;
  const canAccessSuspended = community.canAccessSuspended ?? true;

  // Visual restriction (grayscale/hidden images) only applies to banned or blocked
  const isRestricted = Boolean(isBanned || isBlocked);

  // Navigation is blocked if visually restricted OR suspended without admin/owner access
  const canNavigate = !isRestricted && (!isSuspended || canAccessSuspended);

  return (
    <>
      <Link
        href={!canNavigate ? "#" : `/${locale}/communities/${community.name}`}
        onClick={(e) => {
          if (isBanned) {
            e.preventDefault();
            setIsModalOpen(true);
          } else if (isSuspended && !canAccessSuspended) {
            e.preventDefault();
            setIsSuspendedModalOpen(true);
          }
        }}
        className={cn(
          "flex flex-col rounded-2xl border border-surface-border bg-surface overflow-hidden transition-all group",
          isRestricted
            ? "opacity-60 cursor-pointer grayscale-[50%] hover:-translate-y-1"
            : "hover:-translate-y-1 hover:shadow-lg cursor-pointer",
        )}
      >
        {/* Header Image */}
        <div className="h-24 w-full bg-surface-border/50 relative overflow-hidden flex-shrink-0 flex items-center justify-center">
          {community.headerImage && !isRestricted ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={community.headerImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : community.headerBgColor && !isRestricted ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: community.headerBgColor }}
            >
              {community.headerEmoji && (
                <span
                  className="text-5xl leading-none select-none"
                  style={{ transform: "translateY(-2px)" }}
                >
                  {community.headerEmoji}
                </span>
              )}
            </div>
          ) : isRestricted ? (
            isBanned ? (
              <Ban className="h-8 w-8 text-foreground-40" />
            ) : isSuspended ? (
              <ShieldAlert className="h-8 w-8 text-foreground-40" />
            ) : (
              <Lock className="h-8 w-8 text-foreground-40" />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-surface-border/20" />
          )}
        </div>

        <div className="px-5 pb-5 pt-0 relative flex-1 flex flex-col">
          {/* Avatar overlapping header */}
          <div className="absolute -top-8 left-5">
            <Avatar className="h-16 w-16 border-4 border-surface ring-0 bg-background">
              {community.image && !isRestricted && (
                <AvatarImage src={community.image} />
              )}
              {!community.image && community.avatarBgColor && !isRestricted ? (
                <IconAvatar
                  emoji={community.avatarEmoji}
                  bgColor={community.avatarBgColor}
                  emojiSizeClass="text-2xl"
                />
              ) : (
                <AvatarFallback className="bg-background text-brand font-bold text-xl">
                  {isRestricted ? (
                    isBanned ? (
                      <Ban className="h-6 w-6 text-foreground-40" />
                    ) : isSuspended ? (
                      <ShieldAlert className="h-6 w-6 text-foreground-40" />
                    ) : (
                      <Lock className="h-6 w-6 text-foreground-40" />
                    )
                  ) : (
                    initials
                  )}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          {/* Content */}
          <div className="mt-10 flex flex-col flex-1">
            <div className="flex items-center gap-2 min-w-0 mb-1 flex-wrap">
              <h3 className="font-heading font-bold text-lg text-foreground truncate">
                {community.name}
              </h3>
              {community.isPrivate && !isBanned && (
                <Lock className="h-3.5 w-3.5 text-foreground-40 flex-shrink-0" />
              )}
              {community.isActive === false && !isBanned && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSuspendedModalOpen(true);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning uppercase hover:bg-warning/30 transition-colors"
                >
                  {t("communityPage.suspended_badge")}
                </button>
              )}
            </div>

            <p className="text-xs font-semibold text-foreground-40 uppercase tracking-wider mb-3">
              c/{community.name.toLowerCase().replace(/\s+/g, "")}
            </p>

            <p className="text-sm text-foreground-60 line-clamp-3 leading-relaxed flex-1">
              {isRestricted ? "..." : community.description || ""}
            </p>

            <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-foreground-60 pt-4 border-t border-surface-border">
              <Users className="h-4 w-4" />
              <span>
                {isRestricted ? 0 : community._count?.members || 0}{" "}
                {t("communitiesPage.members")}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {isBanned && (
        <BannedCommunityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          communityName={community.name}
          reason={community.banDetails?.reason || null}
          expires={community.banDetails?.expiresAt || null}
        />
      )}

      {community.isActive === false && (
        <SuspendedInfoModal
          isOpen={isSuspendedModalOpen}
          onClose={() => setIsSuspendedModalOpen(false)}
          reason={community.banReason}
          bannedUntil={community.bannedUntil}
        />
      )}
    </>
  );
}
