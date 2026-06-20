// src/app/[locale]/(protected)/communities/[name]/(components)/community-header.tsx
"use client";

import { SuspendedInfoModal } from "@/components/moderation/suspended-info-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportModal } from "@/components/ui/report-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CommunityHeaderProps } from "@/types/app-types";
import {
  Ban,
  Check,
  Clock3,
  Edit,
  Eye,
  EyeOff,
  Flag,
  Link2,
  Lock,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldAlert,
  Trash2,
  Unlock,
  UserPlus,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditCommunityModal } from "./edit-community-modal";
import { JoinCommunityModal } from "./join-community-modal";
import { OwnerDeleteCommunityModal } from "./owner-delete-community-modal";
import { TransferOwnershipLeaveModal } from "./transfer-ownership-leave-modal";

export function CommunityHeader({
  community,
  isPersonallyHidden,
  onUpdate,
}: CommunityHeaderProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isOwnerDeleteModalOpen, setIsOwnerDeleteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);

  const isAdminOrOwner =
    community.membership.role === "ADMIN" ||
    community.membership.role === "OWNER";
  const hasModAccess =
    isAdminOrOwner || community.membership.role === "MODERATOR";
  const isBanned = community.isBanned;
  const isBlockedByMe = community.isBlockedByMe;
  const isBannedOrBlocked = isBanned || isBlockedByMe;

  // Derive if the user is the only member left in the community and is the owner
  const isSoleOwner =
    community.membership.role === "OWNER" && community.stats.members === 1;

  const initials = community.name.substring(0, 2).toUpperCase();

  const handleJoinClick = () => {
    if (
      community.membership.status === "ACCEPTED" &&
      community.membership.role === "OWNER"
    ) {
      if (isSoleOwner) {
        setIsOwnerDeleteModalOpen(true);
      } else {
        setIsTransferModalOpen(true);
      }
      return;
    }

    if (community.membership.status === "NONE") {
      // Prompt with rules and anonymity warning before joining
      setIsJoinModalOpen(true);
    } else {
      // If already a member or pending, allow them to leave/cancel directly
      handleJoinToggle();
    }
  };

  const handleJoinToggle = async () => {
    if (isJoinLoading) return;
    setIsJoinLoading(true);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.name)}/join`,
        { method: "POST" },
      );
      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoinLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (isBlockLoading) return;
    setIsBlockLoading(true);
    try {
      const method = isBlockedByMe ? "DELETE" : "POST";
      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.name)}/block`,
        { method },
      );
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handlePersonalHide = async () => {
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.name)}/hide`,
        { method: "POST" },
      );
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <>
      <div className="flex flex-col w-full bg-surface border border-surface-border rounded-2xl overflow-hidden mb-6">
        {/* Header Banner */}
        <div
          className={cn(
            "h-32 sm:h-48 w-full relative",
            isBannedOrBlocked ? "bg-surface-border/50" : "bg-brand/10",
          )}
        >
          {community.headerImage && !isBannedOrBlocked ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.headerImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : community.headerBgColor && !isBannedOrBlocked ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: community.headerBgColor }}
            >
              {community.headerEmoji && (
                <span
                  className="text-6xl md:text-8xl lg:text-9xl leading-none select-none"
                  style={{ transform: "translateY(-2px)" }}
                >
                  {community.headerEmoji}
                </span>
              )}
            </div>
          ) : isBannedOrBlocked ? (
            <div className="absolute inset-0 flex items-center justify-center">
              {isBanned ? (
                <Ban className="h-12 w-12 text-foreground-40" />
              ) : (
                <UserX className="h-12 w-12 text-foreground-40" />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-surface-border/20" />
          )}
        </div>

        <div className="px-4 sm:px-6 py-5 relative flex flex-col min-[1080px]:flex-row min-[1080px]:items-center justify-between gap-4">
          {/* Avatar and Title Area */}
          <div className="flex items-end gap-4 min-w-0 relative">
            <div className="absolute -top-14 sm:-top-20 left-0">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-surface ring-0 bg-background">
                {community.image && !isBannedOrBlocked && (
                  <AvatarImage src={community.image} />
                )}
                {!community.image &&
                community.avatarBgColor &&
                !isBannedOrBlocked ? (
                  <IconAvatar
                    emoji={community.avatarEmoji}
                    bgColor={community.avatarBgColor}
                    emojiSizeClass="text-4xl md:text-5xl lg:text-6xl"
                  />
                ) : (
                  <AvatarFallback className="text-3xl font-bold text-brand">
                    {isBanned ? (
                      <Ban className="h-10 w-10 text-foreground-40" />
                    ) : isBlockedByMe ? (
                      <UserX className="h-10 w-10 text-foreground-40" />
                    ) : (
                      initials
                    )}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            <div className="ml-[110px] sm:ml-[144px] flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground truncate">
                  c/{community.name}
                </h1>
                {community.isPrivate && !isBannedOrBlocked && (
                  <Lock className="h-5 w-5 text-foreground-40" />
                )}
                {!community.isActive && !isBannedOrBlocked && (
                  <button
                    onClick={() => setIsSuspendedModalOpen(true)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning uppercase hover:bg-warning/30 transition-colors cursor-pointer"
                  >
                    {t("communityPage.suspended_badge")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          {!isBanned && (
            <div className="flex items-center gap-2 sm:gap-3 mt-2 min-[1080px]:mt-0 w-full min-[1080px]:w-auto shrink-0 flex-wrap min-[1080px]:flex-nowrap">
              {hasModAccess && !isBlockedByMe && (
                <Tooltip
                  content={t("communityPage.moderation_dashboard")}
                  side="bottom"
                >
                  <Link
                    href={`/${locale}/communities/${encodeURIComponent(community.name)}/moderation`}
                    className="min-[1080px]:hidden flex-1 min-[1080px]:flex-none"
                  >
                    <Button
                      variant="outline-surface"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span className="hidden min-[1080px]:inline">
                        {t("communityPage.moderation_dashboard")}
                      </span>
                    </Button>
                  </Link>
                </Tooltip>
              )}

              {isAdminOrOwner && !isBlockedByMe && (
                <Tooltip
                  content={t("communityPage.edit_community")}
                  side="bottom"
                >
                  <div className="min-[1080px]:hidden flex-1 min-[1080px]:flex-none">
                    <Button
                      variant="outline-surface"
                      size="sm"
                      onClick={() => setIsEditModalOpen(true)}
                      aria-label={t("communityPage.edit_community")}
                      className="w-full gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden min-[1080px]:inline">
                        {t("communityPage.edit_community")}
                      </span>
                    </Button>
                  </div>
                </Tooltip>
              )}

              {(!community.isPrivate ||
                community.membership.status === "ACCEPTED") &&
                !isBlockedByMe && (
                  <Tooltip
                    content={t("communityPage.create_post")}
                    side="bottom"
                  >
                    <Link
                      href={`/${locale}/create?c=${encodeURIComponent(community.name)}`}
                      className="flex-1 min-[1080px]:flex-none"
                    >
                      <Button
                        variant="outline-surface"
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden min-[1080px]:inline">
                          {t("communityPage.create_post")}
                        </span>
                      </Button>
                    </Link>
                  </Tooltip>
                )}

              {isBlockedByMe ? (
                <button
                  onClick={handleBlockToggle}
                  disabled={isBlockLoading}
                  aria-label={t("communityPage.unblock_btn")}
                  className="flex-1 min-[1080px]:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-semibold hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isBlockLoading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span className="hidden min-[1080px]:inline">
                        {t("communityPage.unblock_btn")}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <Tooltip
                  content={
                    community.membership.status === "ACCEPTED"
                      ? t("communityPage.joined")
                      : community.membership.status === "PENDING"
                        ? t("communityPage.request_sent")
                        : t("communityPage.join")
                  }
                  side="bottom"
                  sideOffset={6}
                  className="md:hidden z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                >
                  <button
                    onClick={handleJoinClick}
                    disabled={isJoinLoading}
                    aria-label={
                      community.membership.status === "ACCEPTED"
                        ? t("communityPage.joined")
                        : community.membership.status === "PENDING"
                          ? t("communityPage.request_sent")
                          : t("communityPage.join")
                    }
                    className={cn(
                      "flex-1 min-[1080px]:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60",
                      community.membership.status === "ACCEPTED"
                        ? "bg-brand text-white hover:opacity-90"
                        : "bg-brand text-white hover:opacity-90",
                    )}
                  >
                    {isJoinLoading && community.membership.status !== "NONE" ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : community.membership.status === "ACCEPTED" ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span className="hidden min-[1080px]:inline">
                          {t("communityPage.joined")}
                        </span>
                      </>
                    ) : community.membership.status === "PENDING" ? (
                      <>
                        <Clock3 className="h-4 w-4" />
                        <span className="hidden min-[1080px]:inline">
                          {t("communityPage.request_sent")}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden min-[1080px]:inline">
                          {t("communityPage.join")}
                        </span>
                      </>
                    )}
                  </button>
                </Tooltip>
              )}

              <DropdownMenu>
                <Tooltip
                  content={t("communityPage.more")}
                  side="bottom"
                  sideOffset={6}
                  className="z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={t("communityPage.more")}
                      className="flex items-center justify-center h-[42px] w-[42px] rounded-full border border-divider bg-background text-foreground shadow-[inset_0_0_0_1px_var(--divider)] hover:bg-surface-hover hover:shadow-[inset_0_0_0_1px_var(--navbar-border)] transition-all cursor-pointer shrink-0 dark:border-surface-border"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="w-48 overflow-hidden rounded-xl p-0"
                >
                  <DropdownMenuItem className="py-3 px-4 cursor-pointer rounded-none text-foreground-60 font-medium hover:bg-foreground/5">
                    <Share2 className="h-4 w-4 mr-2.5" />{" "}
                    {t("communityPage.share")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={copyLink}
                    className="py-3 px-4 cursor-pointer rounded-none text-foreground-60 font-medium hover:bg-foreground/5"
                  >
                    <Link2 className="h-4 w-4 mr-2.5" />{" "}
                    {t("communityPage.copy_link")}
                  </DropdownMenuItem>
                  {!isAdminOrOwner && !isBlockedByMe && (
                    <DropdownMenuItem
                      onClick={handlePersonalHide}
                      className="py-3 px-4 cursor-pointer rounded-none text-foreground-60 font-medium hover:bg-foreground/5"
                    >
                      {isPersonallyHidden ? (
                        <>
                          <Eye className="h-4 w-4 mr-2.5" />{" "}
                          {t("communityPage.unhide_btn")}
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 mr-2.5" />{" "}
                          {t("communityPage.hide_btn")}
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  {!isAdminOrOwner && (
                    <>
                      <DropdownMenuSeparator className="bg-surface-border" />
                      <DropdownMenuItem
                        onClick={() => setIsReportModalOpen(true)}
                        className="py-3 px-4 cursor-pointer rounded-none font-medium hover:bg-foreground/5 text-foreground-60"
                      >
                        <Flag className="h-4 w-4 mr-2.5" />{" "}
                        {t("communityPage.report")}
                      </DropdownMenuItem>

                      {!isBlockedByMe && (
                        <DropdownMenuItem
                          onClick={handleBlockToggle}
                          disabled={isBlockLoading}
                          className="py-3 px-4 cursor-pointer rounded-none font-medium !text-brand [&_svg]:!text-brand hover:bg-foreground/5 data-[highlighted]:bg-foreground/5"
                        >
                          <Ban className="h-4 w-4 mr-2.5" />{" "}
                          {t("communityPage.block")}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {isAdminOrOwner && !isBlockedByMe && (
                    <>
                      <DropdownMenuSeparator className="bg-surface-border" />
                      <DropdownMenuItem
                        onClick={() => setIsOwnerDeleteModalOpen(true)}
                        className="py-3 px-4 cursor-pointer rounded-none font-medium !text-brand [&_svg]:!text-brand hover:bg-foreground/5 data-[highlighted]:bg-foreground/5"
                      >
                        <Trash2 className="h-4 w-4 mr-2.5 text-brand" />{" "}
                        {t("communityPage.delete_community")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditCommunityModal
        community={community}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={onUpdate}
      />

      <JoinCommunityModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onConfirm={handleJoinToggle}
        communityName={community.name}
        communityRules={community.rules}
        isPrivate={community.isPrivate}
        isLoading={isJoinLoading}
        onRequestClose={() => setIsJoinModalOpen(false)}
      />

      <TransferOwnershipLeaveModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        communityName={community.name}
        onSuccess={onUpdate}
      />

      <OwnerDeleteCommunityModal
        isOpen={isOwnerDeleteModalOpen}
        onClose={() => setIsOwnerDeleteModalOpen(false)}
        communityName={community.name}
        onSuccessComplete={() => router.push(`/${locale}/communities`)}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="COMMUNITY"
        targetId={community.id}
        targetName={`c/${community.name}`}
      />

      <SuspendedInfoModal
        isOpen={isSuspendedModalOpen}
        onClose={() => setIsSuspendedModalOpen(false)}
        reason={community.banReason}
        bannedUntil={community.bannedUntil}
      />
    </>
  );
}
