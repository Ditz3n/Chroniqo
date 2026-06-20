// src/app/[locale]/(protected)/u/[username]/(components)/profile-header.tsx
"use client";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconPickerModal } from "@/components/ui/icon-picker-modal";
import { ImageCropperModal } from "@/components/ui/image-cropper-modal";
import { ImageOrIconDialog } from "@/components/ui/image-or-icon-dialog";
import { ReportModal } from "@/components/ui/report-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ProfileHeaderProps, SessionUpdatePayload } from "@/types/app-types";
import {
  Ban,
  Camera,
  Check,
  ChevronRight,
  Edit,
  Flag,
  Lock,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Unlock,
  UserPlus,
  UserX,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const BIO_MAX_LENGTH = 150;

export function ProfileHeader({
  profile,
  isOwnProfile,
  onUpdate,
}: ProfileHeaderProps) {
  const { t, locale } = useTranslation();
  const { data: session, update: updateSession } = useSession();

  // Avatar dialog state
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [showCopied, setShowCopied] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [friendError, setFriendError] = useState<string | null>(null);

  // Optimistic overrides for instant UI updates
  const [optimisticImage, setOptimisticImage] = useState<
    string | null | undefined
  >(undefined);
  const [optimisticEmoji, setOptimisticEmoji] = useState<
    string | null | undefined
  >(undefined);
  const [optimisticBgColor, setOptimisticBgColor] = useState<
    string | null | undefined
  >(undefined);

  const displayImage =
    optimisticImage !== undefined ? optimisticImage : profile.image;
  const displayEmoji =
    optimisticEmoji !== undefined ? optimisticEmoji : profile.avatarEmoji;
  const displayBgColor =
    optimisticBgColor !== undefined ? optimisticBgColor : profile.avatarBgColor;
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const moodColor = profile.currentMood
    ? DAILY_STATUSES[profile.currentMood.value].color
    : "var(--surface-border)";

  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const isBlocked = profile.isBlockedByMe || profile.hasBlockedMe;

  // Handler for image upload from dialog
  const handleAvatarImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedFile(url);
    setIsAvatarDialogOpen(false);
  };

  // Handler for icon pick from dialog
  const handleAvatarIconPick = () => {
    setIsIconPickerOpen(true);
    setIsAvatarDialogOpen(false);
  };

  // Handler for remove action from dialog
  const handleRemoveAvatarDialog = () => {
    handleRemoveAvatar();
    setIsAvatarDialogOpen(false);
  };

  const handleCropComplete = async (blob: Blob) => {
    const localUrl = URL.createObjectURL(blob);
    setOptimisticImage(localUrl);
    setOptimisticEmoji(null);
    setOptimisticBgColor(null);
    (updateSession as unknown as (data: SessionUpdatePayload) => void)({
      image: localUrl,
      avatarEmoji: null,
      avatarBgColor: null,
    });

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      formData.append("type", "avatar");

      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setImageVersion((v) => v + 1);
        // Show success state, then close
        setTimeout(() => {
          onUpdate();
        }, 1400);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Upload failed", err);
      // Revert optimistic update
      setOptimisticImage(undefined);
      setOptimisticEmoji(undefined);
      setOptimisticBgColor(undefined);
    } finally {
      setIsUploading(false);
    }
  };

  const handleIconConfirm = async (emoji: string | null, bgColor: string) => {
    setOptimisticImage(null);
    setOptimisticEmoji(emoji);
    setOptimisticBgColor(bgColor);
    (updateSession as unknown as (data: SessionUpdatePayload) => void)({
      image: null,
      avatarEmoji: emoji,
      avatarBgColor: bgColor,
    });

    setIsUploading(true);
    try {
      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "avatar-icon", emoji, bgColor }),
      });

      if (res.ok) {
        setImageVersion((v) => v + 1);
        setIsIconPickerOpen(false);

        // Show success state on the selection dialog, then close
        setTimeout(() => {
          onUpdate();
        }, 1400);
      } else {
        throw new Error("Failed");
      }
    } catch (err) {
      console.error("Icon save failed", err);
      // Revert optimistic update
      setOptimisticImage(undefined);
      setOptimisticEmoji(undefined);
      setOptimisticBgColor(undefined);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setOptimisticImage(null);
    setOptimisticEmoji(null);
    setOptimisticBgColor(null);
    (updateSession as unknown as (data: SessionUpdatePayload) => void)({
      image: null,
      avatarEmoji: null,
      avatarBgColor: null,
    });

    setIsUploading(true);
    try {
      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "remove-avatar" }),
      });
      if (res.ok) {
        setImageVersion((v) => v + 1);
        setTimeout(() => {
          onUpdate();
        }, 1400);
      } else {
        throw new Error("Failed");
      }
    } catch (err) {
      console.error("Remove avatar failed", err);
      // Revert optimistic update
      setOptimisticImage(undefined);
      setOptimisticEmoji(undefined);
      setOptimisticBgColor(undefined);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFriendAction = async () => {
    setIsFriendLoading(true);
    setFriendError(null);
    try {
      const method = profile.relationshipStatus === "NONE" ? "POST" : "DELETE";
      const res = await fetch(`/api/users/${profile.username}/friend`, {
        method,
      });
      if (!res.ok) {
        const json = await res.json();
        setFriendError(json.error ?? t("profile.friend_error"));
      } else {
        onUpdate();
      }
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

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profile.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

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

  const hasBioContent = !!profile.bio;
  const shouldShowMobileBio = !isBlocked && (hasBioContent || isOwnProfile);
  const isLongBio =
    profile.bio &&
    (profile.bio.length > 100 || profile.bio.split("\n").length > 3);
  const moreMenuItemCls =
    "py-3 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // Determine whether to render the icon avatar or the image
  const hasIconAvatar = !displayImage && !!displayBgColor;

  return (
    <>
      <div className="flex flex-col items-center justify-center pt-8 pb-4 min-[1080px]:pb-8">
        <div className="relative group">
          <Avatar
            className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background ring-2 ring-offset-2 ring-offset-background"
            style={
              {
                "--tw-ring-color": isBlocked
                  ? "var(--surface-border)"
                  : moodColor,
              } as React.CSSProperties
            }
          >
            {!isBlocked && (
              <AvatarImage
                src={
                  displayImage
                    ? `${displayImage}${displayImage.startsWith("blob:") ? "" : imageVersion ? `?v=${imageVersion}` : ""}`
                    : undefined
                }
                className="object-cover"
              />
            )}
            <AvatarFallback className="text-4xl sm:text-5xl font-bold bg-surface text-foreground p-0 overflow-hidden w-full h-full flex items-center justify-center">
              {isBlocked ? (
                <UserX className="h-12 w-12 text-foreground-40" />
              ) : hasIconAvatar ? (
                <IconAvatar
                  emoji={displayEmoji}
                  bgColor={displayBgColor!}
                  emojiSizeClass="text-5xl sm:text-6xl"
                />
              ) : (
                profile.username?.[0]?.toUpperCase() ||
                t("admin.avatar_fallback")
              )}
            </AvatarFallback>
          </Avatar>

          {profile.role === "ADMIN" && !isBlocked && (
            <Tooltip content={t("roleBadge.system_admin")} side="bottom">
              <div className="absolute bottom-0 left-0 bg-brand text-white rounded-full p-1.5 shadow-md border-2 border-background">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </Tooltip>
          )}

          {isOwnProfile && (
            <Tooltip content={t("profile.edit_avatar")} side="bottom">
              <button
                onClick={() => setIsAvatarDialogOpen(true)}
                className="absolute bottom-0 right-0 bg-surface-opaque border-2 border-surface-border rounded-full p-2 text-foreground-60 hover:text-foreground hover:bg-surface-hover transition-colors shadow-sm cursor-pointer"
              >
                <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </Tooltip>
          )}
          {/* Reusable Avatar selection dialog */}
          <ImageOrIconDialog
            open={isAvatarDialogOpen}
            onClose={() => setIsAvatarDialogOpen(false)}
            title={t("profile.edit_avatar")}
            onImageSelect={handleAvatarImageSelect}
            onIconPick={handleAvatarIconPick}
            showRemove={!!profile.image || !!profile.avatarBgColor}
            onRemove={handleRemoveAvatarDialog}
            removeLabel={t("profile.remove_image")}
            uploadLabel={t("profile.upload_image")}
            pickIconLabel={t("profile.choose_icon_color")}
          />
        </div>

        <h1 className="mt-4 text-2xl sm:text-3xl font-bold font-heading text-foreground text-center flex items-center justify-center gap-2">
          {profile.name || profile.username}
          {profile.emailVerified && (
            <VerifiedBadge className="h-6 w-6 sm:h-7 sm:w-7" />
          )}
          {profile.isPrivate && !isBlocked && (
            <Lock className="h-4 w-4 text-foreground-40" />
          )}
          {profile.role === "ADMIN" && !isBlocked && (
            <Tooltip content={t("roleBadge.system_admin")} side="top">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-brand" />
            </Tooltip>
          )}
        </h1>
        <p className="text-sm font-medium text-foreground-60 mt-1">
          u/{profile.username}
        </p>

        <div className="min-[1080px]:hidden flex flex-col gap-2 mt-4 w-full max-w-sm px-4">
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
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
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

        {/* Mobile Bio Card */}
        {shouldShowMobileBio && (
          <div className="min-[1080px]:hidden mt-4 w-full max-w-sm px-4">
            <div className="rounded-2xl border border-surface-border bg-surface p-4 text-left relative">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-40 mb-3">
                {t("communityPage.about")}
              </h3>
              {isEditingBio ? (
                <div className="flex flex-col gap-2 animate-in fade-in">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    maxLength={BIO_MAX_LENGTH}
                    className="w-full bg-background border border-surface-border rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:border-brand transition-colors h-[100px]"
                    placeholder={t("profile.bio_placeholder") || "Add a bio..."}
                  />
                  <div className="flex items-center justify-between mt-1">
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
                <div className="min-h-[28px]">
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
                  ) : isOwnProfile ? (
                    <p className="text-sm text-foreground-40 italic">
                      {t("profile.no_bio")}
                    </p>
                  ) : null}

                  {isOwnProfile && (
                    <Tooltip content={t("profile.edit_bio")} side="bottom">
                      <Button
                        onClick={() => {
                          setBioText(profile.bio || "");
                          setIsEditingBio(true);
                        }}
                        variant="outline-surface"
                        size="icon"
                        className="absolute top-4 right-4 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="min-[1080px]:hidden mt-3 w-full max-w-sm px-4">
          <div className="rounded-2xl border border-surface-border bg-surface p-4">
            <div className="grid grid-cols-2 gap-3">
              {!isBlocked &&
              (isOwnProfile ||
                !profile.isPrivate ||
                profile.relationshipStatus === "FRIENDS") ? (
                <Link
                  href={`/${locale}/u/${profile.username}/friends`}
                  className="flex flex-col group/stat cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-base font-bold text-foreground truncate">
                      {profile.stats.friends}
                    </span>
                    <ChevronRight className="h-4 w-4 text-foreground-40 group-hover/stat:text-foreground transition-colors" />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground-40 uppercase tracking-wide group-hover/stat:text-foreground transition-colors">
                    {t("profile.stats_friends")}
                  </span>
                </Link>
              ) : (
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold text-foreground truncate">
                    {profile.stats.friends}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground-40 uppercase tracking-wide">
                    {t("profile.stats_friends")}
                  </span>
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-foreground truncate">
                  {profile.stats.posts}
                </span>
                <span className="text-[10px] font-semibold text-foreground-40 uppercase tracking-wide">
                  {t("profile.stats_posts")}
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-foreground truncate">
                  {profile.stats.comments}
                </span>
                <span className="text-[10px] font-semibold text-foreground-40 uppercase tracking-wide">
                  {t("profile.stats_comments")}
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-foreground truncate">
                  {profile.stats.supports}
                </span>
                <span className="text-[10px] font-semibold text-foreground-40 uppercase tracking-wide">
                  {t("profile.stats_supports")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image crop modal */}
      {selectedFile && (
        <ImageCropperModal
          isOpen={!!selectedFile}
          onClose={() => {
            setSelectedFile(null);
          }}
          imageSrc={selectedFile}
          shape="round"
          aspectRatio={1}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Icon + color picker modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentEmoji={profile.avatarEmoji}
        currentBgColor={profile.avatarBgColor}
        previewShape="round"
        onConfirm={handleIconConfirm}
        isSaving={isUploading}
        title={t("profile.choose_icon_color")}
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
    </>
  );
}
