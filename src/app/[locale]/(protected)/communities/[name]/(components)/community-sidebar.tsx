// src/app/[locale]/(protected)/communities/[name]/(components)/community-sidebar.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RuleItem } from "@/components/ui/rule-item";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import {
  CommunityMembersPendingResponse,
  CommunitySidebarProps,
} from "@/types/app-types";
import {
  ChevronRight,
  Edit,
  Globe,
  Lock,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { EditCommunityModal } from "./edit-community-modal";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function CommunitySidebar({
  community,
  onUpdate,
}: CommunitySidebarProps) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const createdDate = new Date(community.createdAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Permission Checks
  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const userRole = community.membership.role;
  const hasMemberAccess =
    isGlobalAdmin || ["OWNER", "ADMIN", "MODERATOR"].includes(userRole || "");

  const { data: memberData } = useSWR<CommunityMembersPendingResponse>(
    hasMemberAccess
      ? [
          `/api/communities/${encodeURIComponent(community.name)}/members`,
          "pending-count",
        ]
      : null,
    ([url]) => fetcher(url),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    },
  );
  const pendingCount =
    memberData?.pending?.length ?? memberData?.members?.pending?.length ?? 0;

  const isBanned = community.isBanned;
  const isBlockedByMe = community.isBlockedByMe;
  const isBannedOrBlocked = isBanned || isBlockedByMe;
  const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";
  const hasModAccess = isAdminOrOwner || userRole === "MODERATOR";

  return (
    <div className="flex flex-col gap-4 w-full sticky top-[76px]">
      {/* About Card */}
      <div className="rounded-2xl border border-surface-border bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-40 mb-3">
          {t("communityPage.about")}
        </h2>

        <p className="text-sm font-medium text-foreground-67 leading-relaxed mb-5">
          {community.description || t("communitiesPage.empty_state")}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-5 border-t border-surface-border mb-5">
          <div className="flex flex-col">
            {hasMemberAccess ? (
              <Link
                href={`/${locale}/communities/${encodeURIComponent(community.name)}/members`}
                className="flex items-center gap-1 group/stat cursor-pointer w-fit"
              >
                <span className="text-lg font-bold text-foreground">
                  {community.stats.members}
                </span>
                <ChevronRight className="h-4 w-4 text-foreground-40 group-hover/stat:text-foreground transition-colors" />
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-none">
                    {pendingCount > 9 ? "+9" : pendingCount}
                  </span>
                )}
              </Link>
            ) : (
              <span className="text-lg font-bold text-foreground">
                {community.stats.members}
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-40">
              {t("communityPage.stats_members")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">
              {community.stats.posts}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-40">
              {t("communityPage.stats_posts")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">
              {community.stats.online}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-40">
              {t("communityPage.stats_online")}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-surface-border">
          <div className="text-xs font-medium text-foreground-40">
            {t("communityPage.created_on").replace("{{date}}", createdDate)}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-foreground-60">
            {community.isPrivate ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            <span>
              {community.isPrivate
                ? t("communityPage.private")
                : t("communityPage.public")}
            </span>
          </div>

          {!isBanned && !isBlockedByMe && (hasModAccess || isAdminOrOwner) && (
            <div className="hidden min-[1080px]:flex flex-col gap-2 mt-4">
              {hasModAccess && (
                <Link
                  href={`/${locale}/communities/${encodeURIComponent(community.name)}/moderation`}
                >
                  <Button
                    variant="outline-surface"
                    size="sm"
                    className="w-full gap-2"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>{t("communityPage.moderation_dashboard")}</span>
                  </Button>
                </Link>
              )}

              {isAdminOrOwner && (
                <Button
                  variant="outline-surface"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full gap-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>{t("communityPage.edit_community")}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rules Card */}
      <div className="rounded-2xl border border-surface-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-4 w-4 text-foreground-40" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-40">
            {t("communityPage.rules")}
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {isBanned ? (
            <div className="text-sm font-medium text-foreground-60">
              {t("communityPage.banned_desc")}
            </div>
          ) : isBlockedByMe ? (
            <div className="text-sm font-medium text-foreground-60">
              {t("communityPage.blocked_rules_desc")}
            </div>
          ) : community.rules && community.rules.length > 0 ? (
            community.rules.map((rule, idx) => (
              <RuleItem key={idx} rule={rule} idx={idx} />
            ))
          ) : (
            <div className="text-sm font-medium text-foreground-60">
              {t("communityPage.no_rules_yet")}
            </div>
          )}
        </div>
      </div>

      {/* Moderators Card */}
      {community.leaders &&
        community.leaders.length > 0 &&
        !isBannedOrBlocked && (
          <div className="rounded-2xl border border-surface-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-foreground-40" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground-40">
                {t("communityPage.moderators")}
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {community.leaders.map((leader) => (
                <Link
                  key={leader.user.id}
                  href={`/${locale}/u/${leader.user.username}`}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      className="h-6 w-6 ring-1 ring-offset-1 ring-offset-background bg-background"
                      style={
                        {
                          "--tw-ring-color": getMoodRingColor(
                            leader.user.dailyStatuses?.[0]?.value,
                          ),
                        } as React.CSSProperties
                      }
                    >
                      {leader.user.image && (
                        <AvatarImage src={leader.user.image} />
                      )}
                      {!leader.user.image && leader.user.avatarBgColor ? (
                        <IconAvatar
                          emoji={leader.user.avatarEmoji}
                          bgColor={leader.user.avatarBgColor}
                          emojiSizeClass="text-base"
                        />
                      ) : (
                        <AvatarFallback className="text-[10px] bg-background text-foreground font-bold text-brand">
                          {leader.user.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm font-semibold text-foreground-60 group-hover:text-foreground transition-colors flex items-center gap-1">
                      u/{leader.user.username}
                      {leader.user.emailVerified && (
                        <VerifiedBadge className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand/80 bg-brand/10 px-2 py-0.5 rounded">
                    {leader.role === "OWNER"
                      ? t("communityPage.role_owner")
                      : leader.role === "ADMIN"
                        ? t("communityPage.role_admin")
                        : t("communityPage.role_moderator")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

      <EditCommunityModal
        community={community}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={onUpdate}
      />
    </div>
  );
}
