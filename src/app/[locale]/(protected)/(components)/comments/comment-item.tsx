// src/app/[locale]/(protected)/(components)/comments/comment-item.tsx
"use client";

import { DeleteContentModal } from "@/components/moderation/delete-content-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportModal } from "@/components/ui/report-modal";
import { RoleBadge } from "@/components/ui/role-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cacheKeys } from "@/lib/cache-keys";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { timeAgo } from "@/lib/utils/time";
import { CommentItemProps } from "@/types/app-types";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  Ghost,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { MarkdownRenderer } from "../posts/markdown-renderer";
import { CommentForm } from "./comment-form";

export function CommentItem({
  comment,
  postAuthorId,
  isPostAnonymous,
  communityId,
  isReply = false,
  viewerCommunityRole = null,
}: CommentItemProps) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();

  const [modDeleteReason, setModDeleteReason] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "report">("main");
  const [reportTarget, setReportTarget] = useState<{
    targetType: "USER" | "COMMENT";
    targetId: string;
    targetName: string;
    communityContextId?: string;
    commentContextId?: string;
  } | null>(null);

  const PANEL_WIDTH = 192;
  const trackOffset = menuView === "main" ? 0 : -PANEL_WIDTH;
  const submenuIconClass =
    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110";

  const [isSupported, setIsSupported] = useState(comment.userSupported);
  const [supportCount, setSupportCount] = useState(comment._count.supportedBy);
  const [isHidden, setIsHidden] = useState(comment.isHidden);

  const isMyComment = session?.user?.id === comment.authorId;
  const isPostAuthor = comment.authorId === postAuthorId;
  const shouldMaskAsAnon = isPostAnonymous && isPostAuthor && !isMyComment;

  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const isCommunityMod = !isGlobalAdmin && !!viewerCommunityRole;
  const canModeratorDelete = !isMyComment && (isGlobalAdmin || isCommunityMod);

  const anonIdentity = comment.anonymousIdentity;

  const isEffectivelyAnonymous =
    comment.isAnonymous || (isPostAnonymous && isPostAuthor);
  const isCommentAnonymousMasked = comment.authorId === "anon";

  const mustMask =
    isCommentAnonymousMasked ||
    (isPostAnonymous &&
      isPostAuthor &&
      !isMyComment &&
      !isGlobalAdmin &&
      !isCommunityMod);

  const canToggleGhost = isEffectivelyAnonymous && !mustMask && !!anonIdentity;
  const [useAnonPreview, setUseAnonPreview] = useState(false);

  const showAsAnon = mustMask || (canToggleGhost && useAnonPreview);

  const displayName = showAsAnon
    ? anonIdentity?.displayName ||
      comment.author.name ||
      t("post.anonymous_post")
    : comment.author.name || comment.author.username;

  const displayUsername = showAsAnon
    ? anonIdentity?.username || comment.author.username || "anonymous"
    : comment.author.username;

  const displayAvatar = showAsAnon ? null : comment.author.image;
  const displayEmoji = showAsAnon
    ? anonIdentity?.avatarEmoji || comment.author.avatarEmoji
    : comment.author.avatarEmoji;
  const displayBgColor = showAsAnon
    ? anonIdentity?.avatarBgColor || comment.author.avatarBgColor
    : comment.author.avatarBgColor;

  // Mood ring is suppressed for anonymous display - it could inadvertently reveal
  // the author's identity by exposing their registered daily status.
  const ringColor = getMoodRingColor(
    showAsAnon ? null : comment.author.dailyStatuses?.[0]?.value,
  );

  const hasReplies = comment.replies && comment.replies.length > 0;
  const showThreadLine = hasReplies || isReplying;

  const [isModDeleteModalOpen, setIsModDeleteModalOpen] = useState(false);

  const getModDeleteLabel = () => {
    if (isGlobalAdmin) return t("post.delete_as_system_admin");
    switch (viewerCommunityRole) {
      case "OWNER":
        return t("post.delete_as_community_owner");
      case "ADMIN":
        return t("post.delete_as_community_admin");
      case "MODERATOR":
        return t("post.delete_as_community_moderator");
      default:
        return "";
    }
  };

  // The modal manages its own loading and success state.
  const handleModeratorDeleteConfirm = async () => {
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: modDeleteReason.trim() || undefined }),
    });
    if (!res.ok) throw new Error("Failed to delete comment");
  };

  // Runs after the success animation closes the modal
  const handleModeratorDeleteSuccess = () => {
    mutate(
      (key) =>
        typeof key === "string" &&
        cacheKeys.posts.isPostCommentKey(key) &&
        key.includes(`/api/posts/${comment.postId}`),
    );
    mutate(
      (key) =>
        typeof key === "string" &&
        cacheKeys.comments.matchesCommentId(
          key,
          comment.parentId || comment.id,
        ),
    );
  };

  const handleSupport = async () => {
    if (isProcessing || !!comment.deletedAt) return;
    setIsSupported(!isSupported);
    setSupportCount((c) => (isSupported ? c - 1 : c + 1));
    setIsProcessing(true);
    try {
      await fetch(`/api/comments/${comment.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "support" }),
      });
    } catch {
      setIsSupported(!isSupported);
      setSupportCount((c) => (!isSupported ? c - 1 : c + 1));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHide = async () => {
    if (isProcessing) return;
    setIsHidden(!isHidden);
    setIsProcessing(true);
    try {
      await fetch(`/api/comments/${comment.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide" }),
      });
    } catch {
      setIsHidden(!isHidden);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
      mutate(
        (key) =>
          typeof key === "string" &&
          cacheKeys.posts.isPostCommentKey(key) &&
          key.includes(`/api/posts/${comment.postId}`),
      );
      mutate(
        (key) =>
          typeof key === "string" &&
          cacheKeys.comments.matchesCommentId(
            key,
            comment.parentId || comment.id,
          ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    if (!url.pathname.endsWith(comment.id)) {
      url.pathname = `${url.pathname}/${comment.id}`;
    }
    navigator.clipboard.writeText(url.toString());
  };

  const openReportModal = (target: {
    targetType: "COMMENT" | "USER";
    targetId: string;
    targetName: string;
    communityContextId?: string;
    commentContextId?: string;
  }) => {
    setReportTarget(target);
    setIsReportModalOpen(true);
    setIsMenuOpen(false);
    setTimeout(() => setMenuView("main"), 250);
  };

  return (
    <>
      <div className="flex gap-3">
        <div className="flex flex-col items-center flex-shrink-0">
          <Link
            href={showAsAnon ? "#" : `/${locale}/u/${displayUsername}`}
            className={cn(
              "flex-shrink-0 mt-1",
              showAsAnon && "pointer-events-none",
            )}
          >
            <Avatar
              className="h-8 w-8 border border-surface-border ring-2 ring-offset-1 ring-offset-background"
              style={{ "--tw-ring-color": ringColor } as React.CSSProperties}
            >
              {displayAvatar ? (
                <AvatarImage src={displayAvatar} />
              ) : displayBgColor ? (
                <IconAvatar
                  emoji={displayEmoji}
                  bgColor={displayBgColor}
                  emojiSizeClass="text-xl"
                />
              ) : (
                <AvatarFallback className="text-[10px] font-bold bg-surface text-foreground">
                  {displayUsername?.[0]?.toUpperCase() ||
                    t("admin.avatar_fallback")}
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
          {showThreadLine && (
            <div className="w-px bg-surface-border flex-1 mt-2 mb-1 rounded-full" />
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
              <Link
                href={showAsAnon ? "#" : `/${locale}/u/${displayUsername}`}
                className={cn(
                  "font-bold text-foreground truncate hover:underline flex items-center gap-1",
                  showAsAnon && "pointer-events-none",
                )}
              >
                {displayName}
                {!showAsAnon && comment.author.emailVerified && (
                  <VerifiedBadge className="h-3.5 w-3.5" />
                )}
              </Link>

              {canToggleGhost && (
                <Tooltip
                  content={t(
                    isMyComment
                      ? `MessagesPage.toggle_own_anon_identity_${useAnonPreview ? "off" : "on"}`
                      : `MessagesPage.toggle_other_anon_identity_${useAnonPreview ? "off" : "on"}`,
                  )}
                  side="top"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setUseAnonPreview(!useAnonPreview);
                    }}
                    className={cn(
                      "flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-pointer flex-shrink-0 mx-0.5",
                      useAnonPreview
                        ? "text-brand bg-brand/10"
                        : "text-foreground-40 hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    <Ghost className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              )}

              {!showAsAnon ? (
                <RoleBadge
                  globalRole={comment.author.globalRole}
                  communityRole={comment.author.communityRole}
                  isAnonymousAuthor={
                    (isPostAnonymous && isPostAuthor) ||
                    (comment.isAnonymous && !isCommentAnonymousMasked)
                  }
                />
              ) : (
                <RoleBadge isAnonymousAuthor />
              )}

              {isPostAuthor && !shouldMaskAsAnon && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                  {t("post.author")}
                </span>
              )}
              <span className="text-foreground-40">•</span>
              <span className="text-foreground-40">
                {timeAgo(comment.createdAt)}
              </span>
              {/* Show (Edited) label whenever the comment has been edited */}
              {comment.editedAt && !comment.deletedAt && (
                <>
                  <span className="text-foreground-40">•</span>
                  <span className="text-foreground-40 italic text-[11px]">
                    {t("post.edited_label")}
                  </span>
                </>
              )}
            </div>

            <DropdownMenu
              open={isMenuOpen}
              onOpenChange={(open) => {
                setIsMenuOpen(open);
                if (!open) setTimeout(() => setMenuView("main"), 250);
              }}
            >
              <Tooltip content={t("post.more")} side="bottom">
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={t("post.more")}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-foreground/8 text-foreground-40 transition-colors cursor-pointer focus:outline-none"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                className="w-48 overflow-hidden p-0"
              >
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    width: `${PANEL_WIDTH * 2}px`,
                    transform: `translateX(${trackOffset}px)`,
                  }}
                >
                  <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
                    <DropdownMenuItem
                      onClick={handleCopyLink}
                      className="py-3 px-4 cursor-pointer rounded-none text-foreground-60 font-medium group/item hover:bg-foreground/5"
                    >
                      <Link2 className={`${submenuIconClass} mr-2.5`} />
                      {t("post.copy_link")}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleHide}
                      className="py-3 px-4 cursor-pointer rounded-none text-foreground-60 font-medium group/item hover:bg-foreground/5"
                    >
                      {isHidden ? (
                        <Eye className={`${submenuIconClass} mr-2.5`} />
                      ) : (
                        <EyeOff className={`${submenuIconClass} mr-2.5`} />
                      )}
                      {isHidden ? t("post.unhide") : t("post.hide")}
                    </DropdownMenuItem>

                    {isMyComment ? (
                      <>
                        {/* Edit option - only available on non-deleted comments */}
                        {!comment.deletedAt && (
                          <>
                            <DropdownMenuSeparator className="m-0 bg-surface-border" />
                            <DropdownMenuItem
                              onClick={() => {
                                setIsMenuOpen(false);
                                setIsEditing(true);
                              }}
                              className="py-3 px-4 cursor-pointer rounded-none text-foreground-60 font-medium group/item hover:bg-foreground/5"
                            >
                              <Pencil
                                className={`${submenuIconClass} mr-2.5`}
                              />
                              {t("post.edit_comment")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator className="m-0 bg-surface-border" />
                        <DropdownMenuItem
                          onClick={handleDelete}
                          disabled={!!comment.deletedAt}
                          className="py-3 px-4 cursor-pointer rounded-none text-brand! font-medium group/item hover:bg-foreground/5 disabled:opacity-50"
                        >
                          <Trash2
                            className={`${submenuIconClass} mr-2.5 text-brand`}
                          />
                          {t("post.delete_comment")}
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        {canModeratorDelete && (
                          <>
                            <DropdownMenuSeparator className="m-0 bg-surface-border" />
                            <DropdownMenuItem
                              onClick={() => {
                                setIsMenuOpen(false);
                                setIsModDeleteModalOpen(true);
                              }}
                              disabled={!!comment.deletedAt}
                              className="py-3 px-4 cursor-pointer rounded-none text-brand! font-medium group/item hover:bg-foreground/5 disabled:opacity-50"
                            >
                              <Trash2
                                className={`${submenuIconClass} mr-2.5 text-brand`}
                              />
                              {getModDeleteLabel()}
                            </DropdownMenuItem>
                          </>
                        )}
                        {!comment.deletedAt && (
                          <>
                            <DropdownMenuSeparator className="m-0 bg-surface-border" />
                            <DropdownMenuItem
                              className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer justify-between"
                              onSelect={(e) => {
                                e.preventDefault();
                                setMenuView("report");
                              }}
                            >
                              <div className="flex items-center">
                                <Flag
                                  className={`${submenuIconClass} mr-2.5 text-brand`}
                                />
                                {t("post.report")}
                              </div>
                              <ChevronRight
                                className={`${submenuIconClass} text-foreground-40`}
                              />
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
                    <div className="flex items-center border-b border-surface-border">
                      <button
                        onClick={() => setMenuView("main")}
                        className="self-stretch pl-4 pr-3 flex items-center justify-center cursor-pointer flex-shrink-0 transition-transform duration-150 active:scale-95 text-foreground-60"
                      >
                        <ChevronLeft className="h-4 w-4 shrink-0 transition-transform duration-200 hover:scale-110" />
                      </button>
                      <span className="text-sm font-bold text-foreground-60 py-3">
                        {t("post.report")}
                      </span>
                    </div>

                    {communityId && (
                      <DropdownMenuItem
                        onClick={() =>
                          openReportModal({
                            targetType: "COMMENT", // 1. Comment -> Community
                            targetId: comment.id,
                            targetName: displayUsername || "User",
                            communityContextId: communityId,
                          })
                        }
                        className="py-3 px-4 cursor-pointer rounded-none text-brand! font-medium group/item hover:bg-foreground/5"
                      >
                        <Flag
                          className={`${submenuIconClass} mr-2.5 text-brand`}
                        />
                        {t("post.report_comment_community")}
                      </DropdownMenuItem>
                    )}

                    {communityId && (
                      <DropdownMenuItem
                        onClick={() =>
                          openReportModal({
                            targetType: "USER", // 2. User -> Community
                            targetId: comment.authorId,
                            targetName: displayUsername || "User",
                            communityContextId: communityId,
                            commentContextId: comment.id,
                          })
                        }
                        className="py-3 px-4 cursor-pointer rounded-none text-brand! font-medium group/item hover:bg-foreground/5"
                      >
                        <Flag
                          className={`${submenuIconClass} mr-2.5 text-brand`}
                        />
                        {t("post.report_user_community")}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() =>
                        openReportModal({
                          targetType: "USER", // 3. User -> Global Admin
                          targetId: comment.authorId,
                          targetName: displayUsername || "User",
                          commentContextId: comment.id,
                        })
                      }
                      className="py-3 px-4 cursor-pointer rounded-none text-brand! font-medium group/item hover:bg-foreground/5"
                    >
                      <Flag
                        className={`${submenuIconClass} mr-2.5 text-brand`}
                      />
                      {t("post.report_user_global")}
                    </DropdownMenuItem>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content area - replaced by inline editor when editing */}
          {isEditing ? (
            <div className="mt-1 mb-2 animate-in fade-in slide-in-from-top-2">
              <CommentForm
                postId={comment.postId}
                communityId={communityId}
                editCommentId={comment.id}
                initialContent={comment.content}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => setIsEditing(false)}
                autoFocus
              />
            </div>
          ) : (
            <div className="text-sm text-foreground mt-0.5">
              {comment.deletedAt ? (
                <span className="italic text-foreground-40 bg-foreground/5 px-2 py-1 rounded-md inline-block">
                  {t("post.comment_deleted")}
                </span>
              ) : isHidden ? (
                <span className="italic text-foreground-40 bg-foreground/5 px-2 py-1 rounded-md inline-block">
                  {t("post.comment_hidden")}
                </span>
              ) : (
                <MarkdownRenderer content={comment.content} />
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5 mb-2">
            <button
              onClick={handleSupport}
              disabled={!!comment.deletedAt || isHidden}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer group hover:bg-foreground/5 px-2 py-1 rounded-full -ml-2 hover:text-foreground",
                isSupported ? "text-brand" : "text-foreground-60",
                (!!comment.deletedAt || isHidden) &&
                  "opacity-50 pointer-events-none",
              )}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-transform group-hover:scale-110",
                  isSupported && "fill-brand",
                )}
              />
              {t("post.support")}
              {supportCount > 0 && <span>{supportCount}</span>}
            </button>

            {!isReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                disabled={!!comment.deletedAt || isHidden}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground-60 hover:text-foreground transition-colors cursor-pointer group hover:bg-foreground/5 px-2 py-1 rounded-full disabled:opacity-50 disabled:pointer-events-none"
              >
                <MessageCircle className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                {t("post.reply")}
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2">
              <CommentForm
                postId={comment.postId}
                parentId={comment.id}
                communityId={communityId}
                onCancel={() => setIsReplying(false)}
                onSuccess={() => setIsReplying(false)}
                autoFocus
              />
            </div>
          )}

          {hasReplies && (
            <div className="flex flex-col gap-4 mt-1">
              {comment.replies!.map((reply) => (
                <div key={reply.id} className="relative">
                  <div className="absolute -left-[27.5px] top-5 w-[27.5px] h-px bg-surface-border" />
                  <CommentItem
                    comment={reply}
                    postAuthorId={postAuthorId}
                    isPostAnonymous={isPostAnonymous}
                    communityId={communityId}
                    isReply={true}
                    viewerCommunityRole={viewerCommunityRole}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canModeratorDelete && !comment.deletedAt && (
        <DeleteContentModal
          isOpen={isModDeleteModalOpen}
          onOpenChange={setIsModDeleteModalOpen}
          title={t("communityPage.delete_comment_title")}
          description={t("communityPage.delete_comment_desc")}
          successMessage={t("post.delete_mod_success_comment").replace(
            "{{username}}",
            displayUsername || "",
          )}
          showReason={true}
          reason={modDeleteReason}
          onReasonChange={setModDeleteReason}
          reasonLabel={t("communityPage.delete_post_reason_label")}
          onConfirm={handleModeratorDeleteConfirm}
          onSuccessComplete={() => {
            setModDeleteReason("");
            handleModeratorDeleteSuccess();
          }}
          confirmLabel={t("communityPage.confirm_delete_comment")}
          confirmingLabel={t("communityPage.deleting_comment")}
        />
      )}

      {!isMyComment && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportTarget(null);
          }}
          targetType={reportTarget?.targetType || "COMMENT"}
          targetId={reportTarget?.targetId || comment.id}
          targetName={reportTarget?.targetName || displayUsername || "User"}
          postContextId={comment.postId}
          communityContextId={reportTarget?.communityContextId}
          commentContextId={reportTarget?.commentContextId}
          targetContent={comment.content}
          targetImage={displayAvatar}
          targetAvatarEmoji={
            !showAsAnon ? comment.author.avatarEmoji : undefined
          }
          targetAvatarBgColor={
            !showAsAnon ? comment.author.avatarBgColor : undefined
          }
        />
      )}
    </>
  );
}
