// src/app/[locale]/(protected)/u/[username]/(components)/profile-sidebar.tsx
"use client";

import { Smiley } from "@/app/(components)/smiley";
import { MutedInfoModal } from "@/components/moderation/muted-info-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconPickerModal } from "@/components/ui/icon-picker-modal";
import { ImageCropperModal } from "@/components/ui/image-cropper-modal";
import { ImageOrIconDialog } from "@/components/ui/image-or-icon-dialog";
import { ReportModal } from "@/components/ui/report-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { BIO_MAX_LENGTH, DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ProfileSidebarProps } from "@/types/app-types";
import {
  Activity,
  Ban,
  Camera,
  Check,
  ChevronRight,
  Edit,
  Flag,
  Lock,
  MicOff,
  MoreHorizontal,
  Pill,
  Ruler,
  Scale,
  Send,
  ShieldCheck,
  Unlock,
  UserPlus,
  UserX,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function ProfileSidebar({
  profile,
  isOwnProfile,
  onUpdate,
}: ProfileSidebarProps) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();

  const [isHeaderDialogOpen, setIsHeaderDialogOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [showCopied, setShowCopied] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showGlobalMuteModal, setShowGlobalMuteModal] = useState(false);

  const moodColor = profile.currentMood
    ? DAILY_STATUSES[profile.currentMood.value].color
    : "var(--surface-border)";
  const memberSinceDate = new Date(profile.createdAt).toLocaleDateString(
    locale,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const isBlocked = profile.isBlockedByMe || profile.hasBlockedMe;

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profile.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const hasAge = profile.age != null;
  const hasConditions = !!profile.conditions?.length;
  const hasMedications = !!profile.medications?.length;
  const hasHeight = profile.height != null;
  const hasWeight = profile.weight != null;
  const hasAny =
    hasAge || hasConditions || hasMedications || hasHeight || hasWeight;

  const moreMenuItemCls =
    "py-3 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";
  const isLongBio =
    profile.bio &&
    (profile.bio.length > 100 || profile.bio.split("\n").length > 3);

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const cleanBio = bioText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .join("\n");

      const res = await fetch(`/api/users/${profile.username}/bio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: cleanBio }),
      });
      if (res.ok) {
        setIsEditingBio(false);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // Handler for image upload from dialog
  const handleHeaderImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedFile(url);
    setIsHeaderDialogOpen(false);
  };

  // Handler for icon pick from dialog
  const handleHeaderIconPick = () => {
    setIsIconPickerOpen(true);
    setIsHeaderDialogOpen(false);
  };

  // Handler for remove action from dialog
  const handleRemoveHeaderDialog = () => {
    handleRemoveHeader();
    setIsHeaderDialogOpen(false);
  };

  const handleCropComplete = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "header.jpg");
      formData.append("type", "header");

      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSelectedFile(null);
        setImageVersion((v) => v + 1);
        setTimeout(() => {
          onUpdate();
        }, 1400);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleIconConfirm = async (emoji: string | null, bgColor: string) => {
    setIsUploading(true);
    try {
      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "header-icon", emoji, bgColor }),
      });

      if (res.ok) {
        setIsIconPickerOpen(false);
        setImageVersion((v) => v + 1);
        setTimeout(() => {
          onUpdate();
        }, 1400);
      }
    } catch (err) {
      console.error("Header icon save failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFriendAction = async () => {
    setIsFriendLoading(true);
    setFriendError(null);
    try {
      if (profile.relationshipStatus === "NONE") {
        const res = await fetch(`/api/users/${profile.username}/friend`, {
          method: "POST",
        });
        if (!res.ok) {
          const json = await res.json();
          setFriendError(json.error ?? t("profile.friend_error"));
          return;
        }
      } else if (profile.relationshipStatus === "REQUEST_RECEIVED") {
        const res = await fetch("/api/users/requests");
        if (!res.ok) {
          setFriendError(t("profile.friend_error"));
          return;
        }
        const { requests } = await res.json();
        const request = requests.find(
          (r: { id: string; sender: { username: string | null } }) =>
            r.sender.username === profile.username,
        );
        if (!request) {
          setFriendError(t("profile.friend_error"));
          return;
        }
        const acceptRes = await fetch(`/api/users/requests/${request.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ACCEPT" }),
        });
        if (!acceptRes.ok) {
          const json = await acceptRes.json();
          setFriendError(json.error ?? t("profile.friend_error"));
          return;
        }
      } else {
        const res = await fetch(`/api/users/${profile.username}/friend`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const json = await res.json();
          setFriendError(json.error ?? t("profile.friend_error"));
          return;
        }
      }
      onUpdate();
    } catch {
      setFriendError(t("profile.friend_error"));
    } finally {
      setIsFriendLoading(false);
    }
  };

  const handleBlockAction = async () => {
    setIsBlockLoading(true);
    try {
      const method = profile.isBlockedByMe ? "DELETE" : "POST";
      const res = await fetch(`/api/users/${profile.username}/block`, {
        method,
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error("Block action failed", err);
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handleRemoveHeader = async () => {
    setIsUploading(true);
    try {
      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "remove-header" }),
      });
      if (res.ok) {
        setImageVersion((v) => v + 1);
        setTimeout(() => {
          onUpdate();
        }, 1400);
      }
    } catch (err) {
      console.error("Remove header failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine the header render strategy
  const hasIconHeader = !profile.headerImage && !!profile.headerBgColor;

  return (
    <div className="hidden min-[1080px]:flex w-full flex-col gap-6 sticky top-[76px] h-fit">
      {/* Header Image Card */}
      <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden flex flex-col">
        <div className="relative h-32 sm:h-40 w-full overflow-hidden group bg-surface-border/50 flex items-center justify-center">
          {profile.headerImage && !isBlocked ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`${profile.headerImage}${imageVersion ? `?v=${imageVersion}` : ""}`}
              alt="Header"
              className="w-full h-full object-cover"
            />
          ) : hasIconHeader && !isBlocked ? (
            // Icon + color header
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: profile.headerBgColor! }}
            >
              {profile.headerEmoji ? (
                <span
                  className="text-6xl leading-none select-none"
                  style={{ transform: "translateY(-2px)" }}
                >
                  {profile.headerEmoji}
                </span>
              ) : null}
            </div>
          ) : !isBlocked ? (
            // Default mood-color smiley header
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: moodColor }}
            >
              <div className="w-20 h-20 opacity-30">
                <Smiley
                  statusValue={
                    profile.currentMood ? profile.currentMood.value : 2
                  }
                  color="white"
                />
              </div>
            </div>
          ) : (
            <UserX className="h-16 w-16 text-foreground-40" />
          )}

          {isOwnProfile && (
            <Tooltip content={t("profile.edit_header")} side="bottom">
              <button
                onClick={() => setIsHeaderDialogOpen(true)}
                className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors cursor-pointer shadow-md backdrop-blur-sm"
              >
                <Camera className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
              {profile.name || profile.username}
              {profile.emailVerified && <VerifiedBadge className="h-5 w-5" />}
              {profile.isPrivate && !isBlocked && (
                <Lock className="h-4 w-4 text-foreground-40" />
              )}
              {profile.role === "ADMIN" && !isBlocked && (
                <Tooltip content={t("roleBadge.system_admin")} side="top">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                </Tooltip>
              )}
            </h2>
            <p className="text-sm font-medium text-foreground-60">
              u/{profile.username}
            </p>

            {/* Inline Bio Editor */}
            {!isBlocked && (
              <div className="mt-4">
                {isEditingBio ? (
                  <div className="flex flex-col gap-2 animate-in fade-in">
                    <textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      maxLength={BIO_MAX_LENGTH}
                      className="w-full bg-background border border-surface-border rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:border-brand transition-colors h-[100px]"
                      placeholder={
                        t("profile.bio_placeholder") || "Add a bio..."
                      }
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-40 font-medium pl-1">
                        {t("profile.bio_character_counter", {
                          current: bioText.length,
                          max: BIO_MAX_LENGTH,
                        })}
                      </span>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBioText(profile.bio || "");
                            setIsEditingBio(false);
                          }}
                          className="h-8 text-xs px-4 bg-surface-border text-foreground hover:bg-foreground/10 rounded-full font-semibold"
                        >
                          {t("communityPage.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveBio}
                          disabled={isSavingBio}
                          className="h-8 text-xs px-4 rounded-full font-semibold"
                        >
                          {isSavingBio ? "..." : t("MessagesPage.save")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative pr-8 min-h-[28px] group/bio">
                    {profile.bio ? (
                      <div className="flex flex-col gap-1">
                        <p
                          className={cn(
                            "text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap",
                            !isBioExpanded && isLongBio && "line-clamp-3",
                          )}
                        >
                          {profile.bio}
                        </p>
                        {isLongBio && (
                          <button
                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                            className="text-xs font-bold text-brand text-left w-fit mt-1 hover:underline cursor-pointer"
                          >
                            {isBioExpanded
                              ? t("profile.show_less")
                              : t("profile.show_more")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground-40 italic">
                        {t("profile.no_bio")}
                      </p>
                    )}

                    {isOwnProfile && (
                      <Tooltip content={t("profile.edit_bio")} side="bottom">
                        <Button
                          onClick={() => {
                            setBioText(profile.bio || "");
                            setIsEditingBio(true);
                          }}
                          variant="outline-surface"
                          size="icon"
                          className="absolute right-0 top-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {!isOwnProfile ? (
                profile.isBlockedByMe ? (
                  <button
                    onClick={handleBlockAction}
                    disabled={isBlockLoading}
                    className="flex-1 min-w-0 py-2 px-4 bg-brand/10 border border-brand/20 text-brand font-semibold text-sm rounded-full hover:bg-brand/20 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isBlockLoading ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" /> {t("profile.unblock")}
                      </>
                    )}
                  </button>
                ) : profile.hasBlockedMe ? (
                  <button
                    disabled
                    className="flex-1 min-w-0 py-2 px-4 bg-brand/10 border border-brand/20 text-brand font-semibold text-sm rounded-full flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <UserX className="h-4 w-4" /> {t("profile.blocked_button")}
                  </button>
                ) : (
                  <button
                    onClick={handleFriendAction}
                    disabled={isFriendLoading}
                    className="min-w-[170px] flex-1 min-w-0 py-2 px-4 bg-brand text-white font-semibold text-sm rounded-full hover:opacity-90 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isFriendLoading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {profile.relationshipStatus === "FRIENDS" && (
                          <>
                            <Check className="h-4 w-4" /> {t("profile.friends")}
                          </>
                        )}
                        {profile.relationshipStatus === "NONE" && (
                          <>
                            <UserPlus className="h-4 w-4" />{" "}
                            {t("profile.add_friend")}
                          </>
                        )}
                        {profile.relationshipStatus === "REQUEST_SENT" && (
                          <>{t("profile.request_sent")}</>
                        )}
                        {profile.relationshipStatus === "REQUEST_RECEIVED" && (
                          <>{t("profile.accept_request")}</>
                        )}
                      </>
                    )}
                  </button>
                )
              ) : (
                <Link
                  href={`/${locale}/u/${profile.username}/settings`}
                  className="flex-1 min-w-0 py-2 px-4 bg-surface-border text-foreground font-semibold text-sm rounded-full hover:bg-foreground/10 transition-colors cursor-pointer text-center"
                >
                  {t("profile.edit_profile") || "Edit Profile"}
                </Link>
              )}

              {isOwnProfile ? (
                <Tooltip content={t("profile.share")} side="bottom">
                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-full border border-surface-border bg-surface hover:bg-foreground/5 text-foreground-60 hover:text-foreground transition-colors cursor-pointer relative"
                  >
                    <Send className="h-4 w-4" />
                    {showCopied && (
                      <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-foreground text-background text-xs font-bold py-1 px-2 rounded z-50">
                        {t("profile.link_copied")}
                      </div>
                    )}
                  </button>
                </Tooltip>
              ) : (
                <DropdownMenu>
                  <Tooltip content={t("post.more")} side="bottom">
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label={t("post.more")}
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
                    <DropdownMenuItem
                      onClick={handleCopyLink}
                      className={moreMenuItemCls}
                    >
                      <Send className="h-4 w-4 mr-2.5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />{" "}
                      {t("profile.share")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsReportModalOpen(true)}
                      disabled={isBlocked}
                      className={cn(moreMenuItemCls, "text-brand! font-bold")}
                    >
                      <Flag className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />{" "}
                      {t("profile.report")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleBlockAction}
                      disabled={isBlocked || isBlockLoading}
                      className={cn(moreMenuItemCls, "text-brand! font-bold")}
                    >
                      <UserX className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />{" "}
                      {t("profile.block")}
                    </DropdownMenuItem>
                    {isGlobalAdmin && (
                      <DropdownMenuItem
                        disabled={isBlocked}
                        className={cn(moreMenuItemCls, "text-brand! font-bold")}
                      >
                        <Ban className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />{" "}
                        {t("profile.ban_platform")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {friendError && !isBlocked && (
              <p className="text-xs text-red-500 text-center">{friendError}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            {!isBlocked &&
            (isOwnProfile ||
              !profile.isPrivate ||
              profile.relationshipStatus === "FRIENDS") ? (
              <Link
                href={`/${locale}/u/${profile.username}/friends`}
                className="flex flex-col group/stat cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-foreground">
                    {profile.stats.friends}
                  </span>
                  <ChevronRight className="h-4 w-4 text-foreground-40 group-hover/stat:text-foreground transition-colors" />
                </div>
                <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider group-hover/stat:text-foreground transition-colors">
                  {t("profile.stats_friends")}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">
                  {profile.stats.friends}
                </span>
                <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                  {t("profile.stats_friends")}
                </span>
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">
                {profile.stats.posts}
              </span>
              <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                {t("profile.stats_posts")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">
                {profile.stats.comments}
              </span>
              <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                {t("profile.stats_comments")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">
                {profile.stats.supports}
              </span>
              <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                {t("profile.stats_supports")}
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-foreground-40 pt-2 border-t border-surface-border">
            {t("profile.member_since").replace("{{date}}", memberSinceDate)}
          </div>
        </div>
      </div>

      {/* Global Mute Banner - own profile and admins only */}
      {(isOwnProfile || isGlobalAdmin) && profile.globalMute && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex items-center gap-3">
          <MicOff className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-xs font-bold text-warning uppercase tracking-wider">
              {t("admin.muted_info_title")}
            </span>
            <span className="text-xs text-foreground-60">
              {profile.globalMute.expiresAt
                ? t("admin.muted_until", {
                    date: new Date(profile.globalMute.expiresAt).toLocaleString(
                      locale,
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      },
                    ),
                  })
                : t("admin.infinite")}
            </span>
          </div>
          <button
            onClick={() => setShowGlobalMuteModal(true)}
            className="text-xs font-semibold text-warning hover:underline flex-shrink-0 cursor-pointer"
          >
            {t("post.more")}
          </button>
        </div>
      )}

      {/* Health & Personal Info */}
      {!isBlocked && hasAny && (
        <div className="rounded-2xl border border-surface-border bg-surface p-5 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-40">
            {t("profile.health_section_title")}
          </h3>

          {hasAge && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <Activity className="h-4 w-4 text-foreground-40 flex-shrink-0" />
              <span>
                {t("profile.health_age", { age: String(profile.age) })}
              </span>
              {isOwnProfile && !profile.showAge && (
                <span className="ml-auto text-[10px] font-bold text-foreground-40 uppercase">
                  {t("profile.health_hidden")}
                </span>
              )}
            </div>
          )}
          {hasHeight && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <Ruler className="h-4 w-4 text-foreground-40 flex-shrink-0" />
              <span>
                {profile.height} {profile.heightUnit ?? "cm"}
              </span>
              {isOwnProfile && !profile.showHeight && (
                <span className="ml-auto text-[10px] font-bold text-foreground-40 uppercase">
                  {t("profile.health_hidden")}
                </span>
              )}
            </div>
          )}
          {hasWeight && (
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <Scale className="h-4 w-4 text-foreground-40 flex-shrink-0" />
              <span>
                {profile.weight} {profile.weightUnit ?? "kg"}
              </span>
              {isOwnProfile && !profile.showWeight && (
                <span className="ml-auto text-foreground-40 uppercase text-[10px] font-bold">
                  {t("profile.health_hidden")}
                </span>
              )}
            </div>
          )}
          {hasConditions && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-foreground-40 flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                  {t("profile.health_conditions")}
                </span>
                {isOwnProfile && !profile.showConditions && (
                  <span className="ml-auto text-[10px] font-bold text-foreground-40 uppercase">
                    {t("profile.health_hidden")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.conditions!.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand/15 text-brand border border-brand/20"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {hasMedications && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-foreground-40 flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider">
                  {t("profile.health_medications")}
                </span>
                {isOwnProfile && !profile.showMedications && (
                  <span className="ml-auto text-[10px] font-bold text-foreground-40 uppercase">
                    {t("profile.health_hidden")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.medications!.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-border text-foreground-60"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Links */}
      <div className="rounded-2xl border border-surface-border bg-transparent p-5 flex-shrink-0">
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs font-medium text-foreground-60">
          <Link
            href={`/${locale}/legal/about`}
            className="hover:text-foreground transition-colors"
          >
            {t("profile.about")}
          </Link>
          <Link
            href={`/${locale}/legal/help`}
            className="hover:text-foreground transition-colors"
          >
            {t("profile.help")}
          </Link>
          <Link
            href={`/${locale}/legal/privacy`}
            className="hover:text-foreground transition-colors"
          >
            {t("profile.privacy")}
          </Link>
        </div>
        <div className="mt-4 text-xs font-bold text-foreground-40 uppercase">
          © {new Date().getFullYear()} CHRONIQO
        </div>
      </div>

      {/* Header selection dialog now handled by ImageOrIconDialog */}
      <ImageOrIconDialog
        open={isHeaderDialogOpen}
        onClose={() => setIsHeaderDialogOpen(false)}
        title={t("profile.edit_header")}
        onImageSelect={handleHeaderImageSelect}
        onIconPick={handleHeaderIconPick}
        showRemove={!!profile.headerImage || !!profile.headerBgColor}
        onRemove={handleRemoveHeaderDialog}
        removeLabel={t("profile.remove_image")}
        uploadLabel={t("profile.upload_image")}
        pickIconLabel={t("profile.choose_icon_color")}
      />

      {/* Header crop modal */}
      {selectedFile && (
        <ImageCropperModal
          isOpen={!!selectedFile}
          onClose={() => {
            setSelectedFile(null);
          }}
          imageSrc={selectedFile!}
          shape="rect"
          aspectRatio={2}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Header icon + color picker modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentEmoji={profile.headerEmoji}
        currentBgColor={profile.headerBgColor}
        previewShape="rect"
        onConfirm={handleIconConfirm}
        isSaving={isUploading}
        title={t("profile.edit_header")}
      />

      {isUploading && !isIconPickerOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[100]">
          <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isOwnProfile && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="USER"
          targetId={profile.id}
          targetName={profile.username || "User"}
          targetAvatarEmoji={profile.avatarEmoji}
          targetAvatarBgColor={profile.avatarBgColor}
        />
      )}

      {(isOwnProfile || isGlobalAdmin) && (
        <MutedInfoModal
          isOpen={showGlobalMuteModal}
          onClose={() => setShowGlobalMuteModal(false)}
          reason={profile.globalMute?.reason ?? null}
          mutedUntil={profile.globalMute?.expiresAt ?? null}
        />
      )}
    </div>
  );
}
