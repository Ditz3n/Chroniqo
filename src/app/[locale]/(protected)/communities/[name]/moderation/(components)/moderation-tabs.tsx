// src/app/[locale]/(protected)/communities/[name]/moderation/(components)/moderation-tabs.tsx
"use client";

import { WarnUserModal } from "@/components/moderation/warn-user-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { MOOD_RING_FALLBACK } from "@/lib/utils/mood-ring";
import {
  ApiReportedComment,
  ApiReportedMember,
  ApiReportedPost,
  CommentPreview,
} from "@/types/app-types";
import {
  ArrowLeft,
  Ban,
  Check,
  Flag,
  Ghost,
  Trash2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { DeleteCommentModal } from "./delete-comment-modal";
import { DeletePostModal } from "./delete-post-modal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ModerationTabs({
  communityName,
  locale,
}: {
  communityName: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "members">(
    "posts",
  );
  const [anonPreviewIds, setAnonPreviewIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const toggleAnonPreview = (userId: string) => {
    setAnonPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
  const [warnTarget, setWarnTarget] = useState<{
    username: string;
    reportId: string;
    postTitle?: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    postId: string;
    reportId: string;
    postTitle?: string;
  } | null>(null);
  const [isDeleteCommentModalOpen, setIsDeleteCommentModalOpen] =
    useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{
    commentId: string;
    reportId: string;
  } | null>(null);
  const [commentPreviewByReportId, setCommentPreviewByReportId] = useState<
    Record<string, CommentPreview>
  >({});

  const { data, isLoading, mutate } = useSWR(
    `/api/communities/${encodeURIComponent(communityName)}/reports`,
    fetcher,
  );

  const handleDismiss = async (reportId: string) => {
    setLoadingAction(reportId);
    try {
      await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      mutate();
    } finally {
      setLoadingAction(null);
    }
  };

  const openWarnModal = (
    username: string,
    reportId: string,
    postTitle?: string,
  ) => {
    setWarnTarget({ username, reportId, postTitle });
    setIsWarnModalOpen(true);
  };

  const openDeleteModal = (
    postId: string,
    reportId: string,
    postTitle?: string,
  ) => {
    setDeleteTarget({ postId, reportId, postTitle });
    setDeleteReason("");
    setIsDeleteModalOpen(true);
  };

  const handleDeletePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    setLoadingAction(`del-${deleteTarget.reportId}`);
    try {
      await fetch(`/api/posts/${deleteTarget.postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason.trim() || undefined }),
      });
      mutate();
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeleteReason("");
    } finally {
      setLoadingAction(null);
    }
  };

  const openDeleteCommentModal = (commentId: string, reportId: string) => {
    setDeleteCommentTarget({ commentId, reportId });
    setIsDeleteCommentModalOpen(true);
  };

  const handleDeleteComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteCommentTarget) return;

    setLoadingAction(`del-${deleteCommentTarget.reportId}`);
    try {
      await fetch(`/api/comments/${deleteCommentTarget.commentId}`, {
        method: "DELETE",
      });
      await fetch(`/api/reports/${deleteCommentTarget.reportId}`, {
        method: "DELETE",
      });
      mutate();
      setIsDeleteCommentModalOpen(false);
      setDeleteCommentTarget(null);
    } finally {
      setLoadingAction(null);
    }
  };

  const {
    postReports = [],
    commentReports = [],
    memberReports = [],
  } = data || {};

  useEffect(() => {
    if (activeTab !== "members" || memberReports.length === 0) return;

    let isCancelled = false;

    const loadCommentPreviews = async () => {
      const missingPreviewReports = memberReports.filter(
        (report: ApiReportedMember) =>
          !report.targetComment && report.targetCommentId,
      );

      if (missingPreviewReports.length === 0) return;

      const previews = await Promise.all(
        missingPreviewReports.map(async (report: ApiReportedMember) => {
          try {
            const response = await fetch(
              `/api/comments/${report.targetCommentId}`,
            );
            if (!response.ok) return null;

            const data = await response.json();
            const commentThread = data.commentThread;
            if (!commentThread) return null;

            return {
              reportId: report.id,
              preview: {
                id: commentThread.id,
                content: commentThread.content ?? null,
                author: {
                  username: commentThread.author?.username ?? null,
                  image: commentThread.author?.image ?? null,
                },
              },
            };
          } catch {
            return null;
          }
        }),
      );

      if (isCancelled) return;

      setCommentPreviewByReportId((current) => {
        const next = { ...current };
        for (const item of previews) {
          if (item) {
            next[item.reportId] = item.preview;
          }
        }
        return next;
      });
    };

    void loadCommentPreviews();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, memberReports]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabs = [
    {
      id: "posts" as const,
      label: t("communityPage.reported_posts"),
      count: postReports.length,
    },
    {
      id: "comments" as const,
      label: t("communityPage.reported_comments"),
      count: commentReports.length,
    },
    {
      id: "members" as const,
      label: t("communityPage.reported_members"),
      count: memberReports.length,
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-6">
        <Link
          href={`/${locale}/communities/${encodeURIComponent(communityName)}`}
          className="inline-flex items-center gap-1 px-3 sm:px-4 py-3 text-sm font-bold text-foreground-60 hover:text-foreground transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("communityPage.back_to_community")}
        </Link>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-foreground-60 hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-none">
                {tab.count > 9 ? "+9" : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {activeTab === "posts" && postReports.length === 0 && (
          <p className="text-center text-foreground-60 py-10 font-medium">
            {t("communityPage.no_reported_posts")}
          </p>
        )}

        {activeTab === "posts" &&
          postReports.map((report: ApiReportedPost) => (
            <div
              key={report.id}
              className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col gap-4"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-brand uppercase flex items-center gap-1 mb-1">
                  <Flag className="h-3 w-3" />{" "}
                  {t("communityPage.reported_post")}
                </span>
                <div className="flex flex-col gap-2 p-3 mt-2 bg-surface-hover border border-surface-border rounded-xl">
                  <Link
                    href={`/${locale}/${report.targetPost?.community?.name ? `communities/${report.targetPost.community.name}` : `u/${report.targetPost?.author?.username}`}/${report.targetPost?.id}`}
                    className="group flex gap-3 p-3 bg-surface border border-surface-border/60 rounded-xl w-full transition-colors hover:bg-foreground/5"
                  >
                    <div className="shrink-0 mt-0.5 relative">
                      {report.targetPost?.author?.id && (
                        <Tooltip
                          content={t(
                            `MessagesPage.toggle_other_anon_identity_${
                              anonPreviewIds.has(report.targetPost.author.id)
                                ? "off"
                                : "on"
                            }`,
                          )}
                          side="top"
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAnonPreview(report.targetPost!.author!.id);
                            }}
                            className={cn(
                              "absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-pointer",
                              anonPreviewIds.has(report.targetPost.author.id)
                                ? "text-brand bg-brand/10 ring-2 ring-background"
                                : "text-foreground-40 bg-surface hover:text-foreground hover:bg-foreground/5 ring-2 ring-background",
                            )}
                          >
                            <Ghost className="h-3 w-3" />
                          </button>
                        </Tooltip>
                      )}
                      <Avatar
                        className="h-8 w-8 border border-surface-border ring-2 ring-offset-1 ring-offset-background"
                        style={
                          {
                            "--tw-ring-color": MOOD_RING_FALLBACK,
                          } as React.CSSProperties
                        }
                      >
                        {report.targetPost?.author &&
                        !anonPreviewIds.has(report.targetPost.author.id) &&
                        report.targetPost.author.image ? (
                          <AvatarImage src={report.targetPost.author.image} />
                        ) : report.targetPost?.author &&
                          anonPreviewIds.has(report.targetPost.author.id) &&
                          report.targetPost.author.avatarBgColor ? (
                          <IconAvatar
                            emoji={report.targetPost.author.avatarEmoji}
                            bgColor={report.targetPost.author.avatarBgColor}
                            emojiSizeClass="text-sm"
                          />
                        ) : null}
                        <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                          {anonPreviewIds.has(
                            report.targetPost?.author?.id || "",
                          )
                            ? "?"
                            : report.targetPost?.author?.username?.[0]?.toUpperCase() ||
                              "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground w-fit group-hover:underline flex items-center gap-1">
                        {report.targetPost?.author &&
                        anonPreviewIds.has(report.targetPost.author.id)
                          ? "Anonymous"
                          : `u/${report.targetPost?.author?.username}`}
                        {report.targetPost?.author &&
                          !anonPreviewIds.has(report.targetPost.author.id) &&
                          report.targetPost.author.emailVerified && (
                            <VerifiedBadge className="h-3 w-3" />
                          )}
                      </span>
                      <span className="text-sm font-semibold text-foreground line-clamp-1 mt-0.5 group-hover:underline">
                        {report.targetPost?.title}
                      </span>
                      <span className="text-sm text-foreground-67 mt-0.5 line-clamp-3">
                        {report.targetPost?.content || "..."}
                      </span>
                    </div>
                  </Link>
                </div>

                <span className="text-xs text-foreground-40 mt-2">
                  {t("communityPage.reported_by").replace("u/{{user}}", "")}
                  {report.reporter?.username ? (
                    <Link
                      href={`/${locale}/u/${report.reporter.username}`}
                      className="text-foreground hover:underline"
                    >
                      u/{report.reporter.username}
                    </Link>
                  ) : (
                    t("admin.unknown_user")
                  )}
                </span>
              </div>
              <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-sm text-foreground-67">
                <span className="font-bold text-brand">
                  {t("communityPage.reason_label")}:
                </span>{" "}
                {report.reason}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  variant="outline-surface"
                  size="sm"
                  disabled={!!loadingAction}
                  onClick={() => handleDismiss(report.id)}
                  className="h-8 text-xs gap-1"
                >
                  <Check className="h-3 w-3" /> {t("communityPage.dismiss_btn")}
                </Button>
                {report.targetPost?.author?.username && (
                  <Button
                    variant="outline-surface"
                    size="sm"
                    disabled={!!loadingAction}
                    onClick={() =>
                      openWarnModal(
                        report.targetPost!.author!.username!,
                        report.id,
                        report.targetPost?.title || undefined,
                      )
                    }
                    className="h-8 text-xs gap-1 text-warning"
                  >
                    <VolumeX className="h-3 w-3" />{" "}
                    {t("communityPage.warn_user_btn")}
                  </Button>
                )}
                {report.targetPostId && (
                  <Button
                    variant="outline-surface"
                    size="sm"
                    disabled={!!loadingAction}
                    onClick={() =>
                      openDeleteModal(
                        report.targetPostId!,
                        report.id,
                        report.targetPost?.title || undefined,
                      )
                    }
                    className="h-8 text-xs gap-1 text-brand"
                  >
                    <Trash2 className="h-3 w-3" /> {t("post.delete")}
                  </Button>
                )}
              </div>
            </div>
          ))}

        {activeTab === "comments" && commentReports.length === 0 && (
          <p className="text-center text-foreground-60 py-10 font-medium">
            {t("communityPage.no_reported_comments")}
          </p>
        )}

        {activeTab === "comments" &&
          commentReports.map((report: ApiReportedComment) => (
            <div
              key={report.id}
              className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col gap-4"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-brand uppercase flex items-center gap-1 mb-3">
                  <Flag className="h-3 w-3" />{" "}
                  {t("communityPage.reported_comment")}
                </span>
                <div className="flex flex-col gap-2 p-3 mb-3 bg-surface-hover border border-surface-border rounded-xl">
                  {report.targetComment?.post?.id &&
                  report.targetComment?.id ? (
                    <Link
                      href={`/${locale}/communities/${report.targetComment.post.community?.name || communityName}/${report.targetComment.post.id}/${report.targetComment.id}`}
                      className="group flex gap-3 p-3 bg-surface border border-surface-border/60 rounded-xl w-full transition-colors hover:bg-foreground/5"
                    >
                      <div className="shrink-0 mt-0.5 relative">
                        {report.targetComment?.author?.id && (
                          <Tooltip
                            content={t(
                              `MessagesPage.toggle_other_anon_identity_${
                                anonPreviewIds.has(
                                  report.targetComment.author.id,
                                )
                                  ? "off"
                                  : "on"
                              }`,
                            )}
                            side="top"
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleAnonPreview(
                                  report.targetComment!.author!.id,
                                );
                              }}
                              className={cn(
                                "absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-pointer",
                                anonPreviewIds.has(
                                  report.targetComment.author.id,
                                )
                                  ? "text-brand bg-brand/10 ring-2 ring-background"
                                  : "text-foreground-40 bg-surface hover:text-foreground hover:bg-foreground/5 ring-2 ring-background",
                              )}
                            >
                              <Ghost className="h-3 w-3" />
                            </button>
                          </Tooltip>
                        )}
                        <Avatar className="h-8 w-8 border border-surface-border">
                          {report.targetComment?.author &&
                          !anonPreviewIds.has(report.targetComment.author.id) &&
                          report.targetComment.author.image ? (
                            <AvatarImage
                              src={report.targetComment.author.image}
                            />
                          ) : report.targetComment?.author?.avatarBgColor ? (
                            <IconAvatar
                              emoji={report.targetComment.author.avatarEmoji}
                              bgColor={
                                report.targetComment.author.avatarBgColor
                              }
                              emojiSizeClass="text-xl"
                            />
                          ) : (
                            <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                              {anonPreviewIds.has(
                                report.targetComment?.author?.id || "",
                              )
                                ? "?"
                                : report.targetComment?.author?.username
                                    ?.charAt(0)
                                    .toUpperCase() ||
                                  t("admin.avatar_fallback")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground w-fit group-hover:underline flex items-center gap-1">
                          {report.targetComment?.author &&
                          anonPreviewIds.has(report.targetComment.author.id)
                            ? "Anonymous"
                            : `u/${report.targetComment?.author?.username}`}
                          {report.targetComment?.author &&
                            !anonPreviewIds.has(
                              report.targetComment.author.id,
                            ) &&
                            report.targetComment.author.emailVerified && (
                              <VerifiedBadge className="h-3 w-3" />
                            )}
                        </span>
                        <span className="text-sm text-foreground-67 mt-0.5 line-clamp-4">
                          {report.targetComment?.content}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex gap-3 p-3 bg-surface border border-surface-border/60 rounded-xl w-full">
                      <div className="shrink-0 mt-0.5 relative">
                        {report.targetComment?.author?.id && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAnonPreview(
                                report.targetComment!.author!.id,
                              );
                            }}
                            className={cn(
                              "absolute -top-2 -right-2 z-10 flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-pointer",
                              anonPreviewIds.has(report.targetComment.author.id)
                                ? "text-brand bg-brand/10 ring-2 ring-background"
                                : "text-foreground-40 bg-surface hover:text-foreground hover:bg-foreground/5 ring-2 ring-background",
                            )}
                          >
                            <Ghost className="h-3 w-3" />
                          </button>
                        )}
                        <Avatar className="h-8 w-8 border border-surface-border">
                          {report.targetComment?.author?.image ? (
                            <AvatarImage
                              src={report.targetComment.author.image}
                            />
                          ) : report.targetComment?.author?.avatarBgColor ? (
                            <IconAvatar
                              emoji={report.targetComment.author.avatarEmoji}
                              bgColor={
                                report.targetComment.author.avatarBgColor
                              }
                              emojiSizeClass="text-xl"
                            />
                          ) : (
                            <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                              {anonPreviewIds.has(
                                report.targetComment?.author?.id || "",
                              )
                                ? "?"
                                : report.targetComment?.author?.username
                                    ?.charAt(0)
                                    .toUpperCase() ||
                                  t("admin.avatar_fallback")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground w-fit flex items-center gap-1">
                          {report.targetComment?.author &&
                          anonPreviewIds.has(report.targetComment.author.id)
                            ? "Anonymous"
                            : `u/${report.targetComment?.author?.username}`}
                          {report.targetComment?.author &&
                            !anonPreviewIds.has(
                              report.targetComment.author.id,
                            ) &&
                            report.targetComment.author.emailVerified && (
                              <VerifiedBadge className="h-3 w-3" />
                            )}
                        </span>
                        <span className="text-sm text-foreground-67 mt-0.5 line-clamp-4">
                          {report.targetComment?.content}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-xs text-foreground-40">
                  {t("communityPage.reported_by").replace("u/{{user}}", "")}
                  {report.reporter?.username ? (
                    <Link
                      href={`/${locale}/u/${report.reporter.username}`}
                      className="text-foreground hover:underline"
                    >
                      u/{report.reporter.username}
                    </Link>
                  ) : (
                    t("admin.unknown_user")
                  )}
                </span>
              </div>
              <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-sm text-foreground-67">
                <span className="font-bold text-brand">
                  {t("communityPage.reason_label")}:
                </span>{" "}
                {report.reason}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  variant="outline-surface"
                  size="sm"
                  disabled={!!loadingAction}
                  onClick={() => handleDismiss(report.id)}
                  className="h-8 text-xs gap-1"
                >
                  <Check className="h-3 w-3" /> {t("communityPage.dismiss_btn")}
                </Button>
                <Button
                  variant="outline-surface"
                  size="sm"
                  disabled={!!loadingAction}
                  onClick={() =>
                    openDeleteCommentModal(report.targetComment!.id, report.id)
                  }
                  className="h-8 text-xs gap-1 text-brand"
                >
                  <Trash2 className="h-3 w-3" /> {t("post.delete_comment")}
                </Button>
              </div>
            </div>
          ))}

        {activeTab === "members" && memberReports.length === 0 && (
          <p className="text-center text-foreground-60 py-10 font-medium">
            {t("communityPage.no_reported_members")}
          </p>
        )}

        {activeTab === "members" &&
          memberReports.map((report: ApiReportedMember) => (
            <div
              key={report.id}
              className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col gap-4"
            >
              {(() => {
                const hasCommentPreview = Boolean(
                  report.targetComment || commentPreviewByReportId[report.id],
                );
                const showPostPreview =
                  Boolean(report.targetPost) && !hasCommentPreview;

                return (
                  <>
                    <span className="text-xs font-bold text-brand uppercase flex items-center gap-1 mb-1">
                      <Flag className="h-3 w-3" /> {t("admin.reported_user")}
                    </span>

                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/${locale}/u/${report.targetUser?.username || "#"}`}
                        className="shrink-0 mt-0.5"
                        aria-label={
                          report.targetUser?.username || "User profile"
                        }
                      >
                        <Avatar className="h-10 w-10 border border-surface-border">
                          {report.targetUser?.image ? (
                            <AvatarImage src={report.targetUser.image} />
                          ) : report.targetUser?.avatarBgColor ? (
                            <IconAvatar
                              emoji={report.targetUser.avatarEmoji}
                              bgColor={report.targetUser.avatarBgColor}
                              emojiSizeClass="text-xl"
                            />
                          ) : (
                            <AvatarFallback className="text-xs bg-background text-foreground">
                              {report.targetUser?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </Link>

                      <Link
                        href={`/${locale}/u/${report.targetUser?.username || "#"}`}
                        className="group flex flex-col min-w-0 flex-1"
                      >
                        <span className="text-sm font-semibold text-foreground truncate group-hover:underline flex items-center gap-1">
                          {report.targetUser?.name ??
                            report.targetUser?.username}
                          {report.targetUser &&
                            report.targetUser.emailVerified && (
                              <VerifiedBadge className="h-3.5 w-3.5" />
                            )}
                        </span>
                        <span className="text-xs text-foreground-60 truncate group-hover:underline">
                          u/{report.targetUser?.username}
                        </span>
                      </Link>
                    </div>

                    {showPostPreview && report.targetPost && (
                      <div className="flex flex-col gap-2 p-4 bg-surface-hover border border-surface-border rounded-xl">
                        <span className="text-xs font-bold text-brand uppercase flex items-center gap-1">
                          <Flag className="h-3 w-3" />{" "}
                          {t("communityPage.reported_post")}
                        </span>
                        <span className="text-xs text-foreground-60">
                          {t("admin.report_context_post")}{" "}
                          <Link
                            href={`/${locale}/${report.targetPost.community?.name ? `communities/${report.targetPost.community.name}` : `u/${report.targetUser?.username}`}/${report.targetPost.id}`}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {report.targetPost.title}
                          </Link>{" "}
                          {report.targetPost.community ? (
                            <>
                              {t("admin.in_community")}{" "}
                              <Link
                                href={`/${locale}/communities/${report.targetPost.community.name}`}
                                className="font-semibold text-foreground hover:underline"
                              >
                                c/{report.targetPost.community.name}
                              </Link>
                            </>
                          ) : (
                            <>
                              {t("admin.on_profile")}{" "}
                              <Link
                                href={`/${locale}/u/${report.targetUser?.username}`}
                                className="font-semibold text-foreground hover:underline"
                              >
                                u/{report.targetUser?.username}
                              </Link>
                            </>
                          )}
                        </span>

                        <Link
                          href={`/${locale}/${report.targetPost.community?.name ? `communities/${report.targetPost.community.name}` : `u/${report.targetUser?.username}`}/${report.targetPost.id}`}
                          className="group flex gap-3 p-3 bg-surface border border-surface-border/60 rounded-xl mt-1 w-full transition-colors hover:bg-foreground/5"
                        >
                          <div className="shrink-0 mt-0.5">
                            <Avatar className="h-8 w-8 border border-surface-border">
                              {report.targetPost.author.image ? (
                                <AvatarImage
                                  src={report.targetPost.author.image}
                                />
                              ) : report.targetPost.author.avatarBgColor ? (
                                <IconAvatar
                                  emoji={report.targetPost.author.avatarEmoji}
                                  bgColor={
                                    report.targetPost.author.avatarBgColor
                                  }
                                  emojiSizeClass="text-xl"
                                />
                              ) : (
                                <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                                  {report.targetPost.author.username?.[0]?.toUpperCase() ||
                                    t("admin.avatar_fallback")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground w-fit group-hover:underline">
                              u/{report.targetPost.author.username}
                            </span>
                            <span className="text-sm font-semibold text-foreground line-clamp-1 mt-0.5 group-hover:underline">
                              {report.targetPost.title}
                            </span>
                            <span className="text-sm text-foreground-67 mt-0.5 line-clamp-3">
                              {report.targetPost.content || "..."}
                            </span>
                          </div>
                        </Link>
                      </div>
                    )}

                    {(report.targetComment ||
                      commentPreviewByReportId[report.id]) &&
                      (() => {
                        const commentData =
                          report.targetComment ||
                          commentPreviewByReportId[report.id];

                        return (
                          <div className="flex flex-col gap-2 p-4 bg-surface-hover border border-surface-border rounded-xl">
                            <span className="text-xs font-bold text-brand uppercase flex items-center gap-1">
                              <Flag className="h-3 w-3" />{" "}
                              {t("admin.report_context_comment")}
                            </span>
                            {report.targetComment ? (
                              <span className="text-xs text-foreground-60">
                                {t("admin.report_context_comment")}{" "}
                                {t("admin.in_post")}{" "}
                                <Link
                                  href={`/${locale}/${report.targetComment.post.community?.name ? `communities/${report.targetComment.post.community.name}` : `u/${report.targetUser?.username}`}/${report.targetComment.post.id}/${report.targetComment.id}`}
                                  className="font-semibold text-foreground hover:underline"
                                >
                                  {report.targetComment.post.title}
                                </Link>{" "}
                                {t("admin.in_community")}{" "}
                                {report.targetComment.post.community ? (
                                  <Link
                                    href={`/${locale}/communities/${report.targetComment.post.community.name}`}
                                    className="font-semibold text-foreground hover:underline"
                                  >
                                    c/{report.targetComment.post.community.name}
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/${locale}/u/${report.targetUser?.username}`}
                                    className="font-semibold text-foreground hover:underline"
                                  >
                                    u/{report.targetUser?.username}
                                  </Link>
                                )}
                              </span>
                            ) : null}
                            {report.targetComment ? (
                              <Link
                                href={`/${locale}/${report.targetComment.post.community?.name ? `communities/${report.targetComment.post.community.name}` : `u/${report.targetUser?.username}`}/${report.targetComment.post.id}/${report.targetComment.id}`}
                                className="group flex gap-3 p-3 bg-surface border border-surface-border/60 rounded-xl mt-1 w-full transition-colors hover:bg-foreground/5"
                              >
                                <div className="shrink-0 mt-0.5">
                                  <Avatar className="h-8 w-8 border border-surface-border">
                                    {commentData.author.image && (
                                      <AvatarImage
                                        src={commentData.author.image}
                                      />
                                    )}
                                    <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                                      {commentData.author.username?.[0]?.toUpperCase() ||
                                        "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-foreground w-fit group-hover:underline">
                                    u/{commentData.author.username}
                                  </span>
                                  <span className="text-sm text-foreground-67 mt-0.5 line-clamp-3">
                                    {commentData.content}
                                  </span>
                                </div>
                              </Link>
                            ) : (
                              <div className="flex gap-3 p-3 bg-surface border border-surface-border/60 rounded-xl mt-1 w-full">
                                <div className="shrink-0 mt-0.5">
                                  <Avatar className="h-8 w-8 border border-surface-border">
                                    {commentData.author.image && (
                                      <AvatarImage
                                        src={commentData.author.image}
                                      />
                                    )}
                                    <AvatarFallback className="text-xs font-bold bg-brand/20 text-brand">
                                      {commentData.author.username?.[0]?.toUpperCase() ||
                                        "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-foreground w-fit">
                                    u/{commentData.author.username}
                                  </span>
                                  <span className="text-sm text-foreground-67 mt-0.5 line-clamp-3">
                                    {commentData.content}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-sm text-foreground-67">
                      <span className="font-bold text-brand">
                        {t("communityPage.reason_label")}:
                      </span>{" "}
                      {report.reason}
                    </div>

                    <span className="text-xs text-foreground-40">
                      {
                        t("communityPage.reported_by")
                          .replace("u/{{user}}", "{{user}}")
                          .split("{{user}}", 1)[0]
                      }
                      <Link
                        href={`/${locale}/u/${report.reporter?.username || "#"}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        u/{report.reporter?.username || t("admin.unknown_user")}
                      </Link>
                      {t("communityPage.reported_by")
                        .replace("u/{{user}}", "{{user}}")
                        .split("{{user}}", 2)[1] || ""}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        variant="outline-surface"
                        size="sm"
                        disabled={!!loadingAction}
                        onClick={() => handleDismiss(report.id)}
                        className="h-8 text-xs gap-1"
                      >
                        <Check className="h-3 w-3" />{" "}
                        {t("communityPage.dismiss_btn")}
                      </Button>
                      {report.targetUser?.username && (
                        <Button
                          variant="outline-surface"
                          size="sm"
                          disabled={!!loadingAction}
                          onClick={() =>
                            openWarnModal(
                              report.targetUser!.username!,
                              report.id,
                            )
                          }
                          className="h-8 text-xs gap-1 text-warning"
                        >
                          <VolumeX className="h-3 w-3" />{" "}
                          {t("communityPage.warn_user_btn")}
                        </Button>
                      )}
                      <Link
                        href={`/${locale}/communities/${encodeURIComponent(
                          communityName,
                        )}/members`}
                      >
                        <Button
                          variant="outline-surface"
                          size="sm"
                          className="h-8 text-xs gap-1"
                        >
                          <Ban className="h-3 w-3" />{" "}
                          {t("communityPage.manage_access")}
                        </Button>
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
      </div>

      <WarnUserModal
        isOpen={isWarnModalOpen}
        onClose={() => setIsWarnModalOpen(false)}
        communityName={communityName}
        target={warnTarget}
        onWarned={async (reportId: string) => {
          await handleDismiss(reportId);
        }}
      />

      <DeletePostModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        postTitle={deleteTarget?.postTitle}
        deleteReason={deleteReason}
        onDeleteReasonChange={setDeleteReason}
        onSubmit={handleDeletePost}
        loadingAction={loadingAction}
      />

      <DeleteCommentModal
        isOpen={isDeleteCommentModalOpen}
        onOpenChange={setIsDeleteCommentModalOpen}
        onSubmit={handleDeleteComment}
        loadingAction={loadingAction}
      />
    </div>
  );
}
