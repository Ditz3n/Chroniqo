// src/app/[locale]/(protected)/(components)/posts/post-header.tsx
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportModal } from "@/components/ui/report-modal";
import { RoleBadge } from "@/components/ui/role-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ApiPost, PostHeaderProps } from "@/types/app-types";
import {
  BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  Ghost,
  MoreHorizontal,
  Pin,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";

export function PostHeader({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
}: PostHeaderProps) {
  const { t, locale } = useTranslation();
  const { mutate, cache } = useSWRConfig();
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "report">("main");
  const [isModDeleteModalOpen, setIsModDeleteModalOpen] = useState(false);
  const [modDeleteReason, setModDeleteReason] = useState("");
  const [reportTarget, setReportTarget] = useState<{
    targetType: "POST" | "USER";
    targetId: string;
    targetName: string;
    targetAuthorName?: string;
    communityContextId?: string;
    postContextId?: string;
  } | null>(null);

  const PANEL_WIDTH = 224;

  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const viewerCommunityRole = post.viewerCommunityRole ?? null;
  const isCommunityMod = !isGlobalAdmin && !!viewerCommunityRole;

  // Can only toggle ghost if the post is actually anonymous, the viewer is privileged, and identity is mapped
  const canToggleGhost =
    post.isAnonymous &&
    (post.isAuthor || isGlobalAdmin || isCommunityMod) &&
    !!post.anonymousIdentity;
  const [useAnonPreview, setUseAnonPreview] = useState(false);

  // Derive display values based on ghost toggle state
  const displayName =
    useAnonPreview && post.anonymousIdentity
      ? post.anonymousIdentity.displayName
      : post.author;
  const displayUsername =
    useAnonPreview && post.anonymousIdentity
      ? post.anonymousIdentity.username
      : post.authorUsername;
  const displayImage = useAnonPreview ? null : post.authorImage;
  const displayEmoji =
    useAnonPreview && post.anonymousIdentity
      ? post.anonymousIdentity.avatarEmoji
      : post.authorAvatarEmoji;
  const displayBgColor =
    useAnonPreview && post.anonymousIdentity
      ? post.anonymousIdentity.avatarBgColor
      : post.authorAvatarBgColor;
  const displayEmailVerified = useAnonPreview
    ? false
    : post.authorEmailVerified;

  const initials =
    post.community !== "Profile"
      ? post.community[0]?.toUpperCase() || "C"
      : displayUsername?.[0]?.toUpperCase() ||
        displayName?.[0]?.toUpperCase() ||
        "U";

  const updatePostInCache = (updater: (p: ApiPost) => ApiPost) => {
    for (const key of cache.keys()) {
      if (typeof key === "string" && key.includes("/api/")) {
        mutate(
          key,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (currentData: any) => {
            if (!currentData) return currentData;
            if (Array.isArray(currentData) && currentData[0]?.posts) {
              return currentData.map((page) => ({
                ...page,
                posts: page.posts.map((p: ApiPost) =>
                  p.id === post.id ? updater(p) : p,
                ),
              }));
            }
            if (currentData.posts) {
              return {
                ...currentData,
                posts: currentData.posts.map((p: ApiPost) =>
                  p.id === post.id ? updater(p) : p,
                ),
              };
            }
            return currentData;
          },
          { revalidate: false },
        );
      }
    }
  };

  const isPostListKey = (key: string) =>
    key.includes("/api/feed?") ||
    (key.includes("/api/communities/") && key.includes("/posts?")) ||
    (key.includes("/api/users/") && key.includes("/posts?"));

  const isProfilePostListKey = (key: string) =>
    key.includes("/api/users/") && key.includes("/posts?");

  const removePostFromCache = (keyCondition?: (key: string) => boolean) => {
    for (const key of cache.keys()) {
      if (typeof key === "string" && key.includes("/api/")) {
        if (keyCondition && !keyCondition(key)) continue;

        mutate(
          key,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (currentData: any) => {
            if (!currentData) return currentData;
            if (Array.isArray(currentData) && currentData[0]?.posts) {
              return currentData.map((page) => ({
                ...page,
                posts: page.posts.filter((p: ApiPost) => p.id !== post.id),
              }));
            }
            if (currentData.posts) {
              return {
                ...currentData,
                posts: currentData.posts.filter(
                  (p: ApiPost) => p.id !== post.id,
                ),
              };
            }
            return currentData;
          },
          { revalidate: false },
        );
      }
    }
  };

  const handleAction = async (action: "save" | "hide" | "pin" | "spoiler") => {
    if (isProcessing) return;
    setIsProcessing(true);

    let shouldRevalidateProfilePosts = false;

    try {
      // 1. Optimistic UI Updates & Cross-Cache Syncing
      if (action === "save") {
        // Toggle state everywhere first so dropdowns in other tabs update
        updatePostInCache((p) => ({ ...p, isSaved: !post.isSaved }));

        if (post.isSaved && currentTab === "saved") {
          // Unsaving from the Saved tab: collapse and remove from this specific cache
          onHideDelete?.();
          setTimeout(
            () => removePostFromCache((k) => k.includes("tab=saved")),
            400,
          );
        } else if (!post.isSaved) {
          // Saving a post: silently fetch the saved tab in the background so it's there when we navigate
          mutate(
            (k) =>
              typeof k === "string" &&
              isPostListKey(k) &&
              k.includes("tab=saved"),
            undefined,
            { revalidate: true },
          );
        }
      } else if (action === "hide") {
        updatePostInCache((p) => ({ ...p, isHidden: !post.isHidden }));

        if (post.isHidden) {
          // Unhiding
          if (currentTab === "hidden") {
            onHideDelete?.();
            setTimeout(
              () => removePostFromCache((k) => k.includes("tab=hidden")),
              400,
            );
          }

          // Silently revalidate main feeds so the post is restored there
          mutate(
            (k) =>
              typeof k === "string" &&
              isPostListKey(k) &&
              !k.includes("tab=hidden"),
            undefined,
            { revalidate: true },
          );
        } else {
          // Hiding
          onHideDelete?.();
          setTimeout(
            () => removePostFromCache((k) => !k.includes("tab=hidden")),
            400,
          );
          mutate(
            (k) =>
              typeof k === "string" &&
              isPostListKey(k) &&
              k.includes("tab=hidden"),
            undefined,
            { revalidate: true },
          );
        }
      } else if (action === "pin") {
        shouldRevalidateProfilePosts = true;
        const nextPinned = !post.isPinned;

        const getSortFromKey = (key: string) => {
          try {
            const query = key.split("?")[1] || "";
            const params = new URLSearchParams(query);
            return params.get("sort") || "new";
          } catch {
            return "new";
          }
        };

        const sortByCurrentTabOrder = (posts: ApiPost[], sort: string) => {
          const sorted = [...posts];

          if (
            sort === "top" ||
            sort === "best" ||
            sort === "hot" ||
            sort === "rising"
          ) {
            sorted.sort(
              (a, b) => (b._count?.comments || 0) - (a._count?.comments || 0),
            );
            return sorted;
          }

          sorted.sort((a, b) => {
            const aCreated = new Date(
              (a as ApiPost & { createdAt?: string | Date }).createdAt || 0,
            ).getTime();
            const bCreated = new Date(
              (b as ApiPost & { createdAt?: string | Date }).createdAt || 0,
            ).getTime();
            return bCreated - aCreated;
          });

          return sorted;
        };

        const applyPinUpdate = (posts: ApiPost[], key: string) => {
          const updated = posts.map((p) => {
            if (p.id === post.id) return { ...p, isPinned: nextPinned };
            if (p.author.id === session?.user?.id)
              return { ...p, isPinned: false };
            return p;
          });

          const isProfilePostsKey =
            key.includes("/api/users/") && key.includes("/posts?");

          // For profile post lists, reflect pin/unpin ordering immediately.
          if (!isProfilePostsKey) return updated;

          const targetIdx = updated.findIndex((p) => p.id === post.id);
          if (targetIdx === -1) return updated;

          if (nextPinned) {
            if (targetIdx === 0) return updated;
            const reordered = [...updated];
            const [target] = reordered.splice(targetIdx, 1);
            reordered.unshift(target);
            return reordered;
          }

          const target = updated[targetIdx];
          const rest = updated.filter((_, idx) => idx !== targetIdx);
          return sortByCurrentTabOrder([...rest, target], getSortFromKey(key));
        };

        for (const key of cache.keys()) {
          if (typeof key === "string" && key.includes("/api/")) {
            mutate(
              key,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (data: any) => {
                if (!data) return data;
                if (Array.isArray(data)) {
                  const pageSizes = data.map((page) => page.posts.length);
                  const flatPosts = data.flatMap(
                    (page) => page.posts as ApiPost[],
                  );
                  const updatedFlat = applyPinUpdate(flatPosts, key);

                  let cursor = 0;
                  return data.map((page, idx) => {
                    const count = pageSizes[idx];
                    const pagePosts = updatedFlat.slice(cursor, cursor + count);
                    cursor += count;
                    return { ...page, posts: pagePosts };
                  });
                }

                if (data.posts)
                  return {
                    ...data,
                    posts: applyPinUpdate(data.posts as ApiPost[], key),
                  };
                return data;
              },
              { revalidate: false },
            );
          }
        }
      } else if (action === "spoiler") {
        updatePostInCache((p) => {
          const postWithSpoiler = p as ApiPost & { spoiler?: boolean };
          const nextSpoiler = !post.spoiler;

          return {
            ...postWithSpoiler,
            spoiler: nextSpoiler,
            metadata: { ...(p.metadata || {}), spoiler: nextSpoiler },
          } as ApiPost;
        });
      }

      // 2. Network Request
      await fetch(`/api/posts/${post.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (shouldRevalidateProfilePosts) {
        mutate(
          (k) =>
            typeof k === "string" &&
            isPostListKey(k) &&
            isProfilePostListKey(k),
          undefined,
          { revalidate: true },
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      onHideDelete?.();
      setTimeout(() => removePostFromCache(), 400);
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // The modal manages its own loading and success state.
  // This function only performs the network request and throws on failure.
  const handleModeratorDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: modDeleteReason.trim() || undefined }),
    });
    if (!res.ok) throw new Error("Failed to delete post");
    console.log("[PostHeader] Moderator delete succeeded:", post.id);
  };

  // Runs after the success animation closes the modal
  const handleModeratorDeleteSuccess = () => {
    onHideDelete?.();
    removePostFromCache();
    setModDeleteReason("");
  };

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    if (!open) {
      setTimeout(() => setMenuView("main"), 250);
    }
  };

  const openReportModal = (target: {
    targetType: "POST" | "USER";
    targetId: string;
    targetName: string;
    targetAuthorName?: string;
    communityContextId?: string;
    postContextId?: string;
  }) => {
    setReportTarget(target);
    setIsReportModalOpen(true);
    setIsMenuOpen(false);
  };

  const isProfilePost = post.community === "Profile";
  const disablePin = hasPinnedPostInFeed && !post.isPinned;
  const trackOffset = menuView === "main" ? 0 : -PANEL_WIDTH;
  const canReportPostAuthor =
    !!post.authorId &&
    !!post.authorUsername &&
    post.authorUsername !== "anonymous";
  const canModeratorDelete =
    !post.isAuthor && (isGlobalAdmin || isCommunityMod);

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

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-2 relative",
          layout === "card" && "px-4 pt-4 pb-2",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/${locale}/${isProfilePost ? `u/${displayUsername}` : `communities/${post.community}`}`}
            className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-7 w-7 border border-surface-border bg-background">
              <AvatarImage
                src={
                  (isProfilePost ? displayImage : post.communityAvatar) ||
                  undefined
                }
                className="object-cover"
              />
              <AvatarFallback className="bg-brand/20 text-[10px] font-bold text-brand p-0 overflow-hidden w-full h-full flex items-center justify-center">
                {!(isProfilePost ? displayImage : post.communityAvatar) &&
                (isProfilePost
                  ? displayBgColor
                  : post.communityAvatarBgColor) ? (
                  <IconAvatar
                    emoji={
                      isProfilePost ? displayEmoji : post.communityAvatarEmoji
                    }
                    bgColor={
                      (isProfilePost
                        ? displayBgColor
                        : post.communityAvatarBgColor)!
                    }
                    emojiSizeClass="text-sm"
                  />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex items-center gap-1 text-xs min-w-0 flex-wrap">
            {!isProfilePost && (
              <>
                <Link
                  href={`/${locale}/communities/${post.community}`}
                  className="font-semibold text-foreground-67 truncate hover:underline cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  c/{post.community.replace(/\s+/g, "")}
                </Link>
                <span className="text-foreground-40">•</span>
              </>
            )}

            {post.isAnonymous && !canToggleGhost ? (
              <span className="flex items-center text-foreground-60 truncate">
                {displayName}
              </span>
            ) : (
              <Link
                href={`/${locale}/u/${displayUsername}`}
                className="flex items-center text-foreground-60 truncate hover:underline cursor-pointer gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                u/{displayUsername}
                {displayEmailVerified && (
                  <VerifiedBadge className="h-3.5 w-3.5" />
                )}
              </Link>
            )}

            {/* Ghost Toggle Button for Admins/Mods observing their own members' anonymous posts */}
            {canToggleGhost && (
              <Tooltip
                content={t(
                  post.isAuthor
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

            {/* Role badges are only shown when the author's real identity is visible */}
            {!useAnonPreview && !post.isAnonymous ? (
              <RoleBadge
                globalRole={post.authorGlobalRole}
                communityRole={post.authorCommunityRole}
                isAnonymousAuthor={post.isAnonymous}
              />
            ) : (
              // When previewing anon, or if forced anon, they get the ghost
              <RoleBadge isAnonymousAuthor />
            )}

            <span className="text-foreground-40">•</span>
            <span className="text-foreground-40 flex-shrink-0">
              {post.timeAgo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {post.isPinned && (
            <Pin className="h-3.5 w-3.5 text-brand fill-brand/20" />
          )}
          <DropdownMenu open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
            <Tooltip content={t("post.more")} side="bottom">
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={t("post.more")}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-foreground/8 text-foreground-40 hover:text-foreground transition-colors cursor-pointer flex-shrink-0 focus:outline-none"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="w-56 overflow-hidden p-0"
            >
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  width: `${PANEL_WIDTH * 2}px`,
                  transform: `translateX(${trackOffset}px)`,
                }}
              >
                <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
                  <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
                    {t("post.more")}
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("save");
                    }}
                    className="py-3 px-4 rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 cursor-pointer"
                  >
                    <BookmarkIcon
                      className={cn(
                        "h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110",
                        post.isSaved && "fill-current text-brand",
                      )}
                    />
                    {post.isSaved ? t("post.unsave") : t("post.save")}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("hide");
                    }}
                    className="py-3 px-4 rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 cursor-pointer"
                  >
                    {post.isHidden ? (
                      <>
                        <Eye className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                        {t("post.unhide")}
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                        {t("post.hide")}
                      </>
                    )}
                  </DropdownMenuItem>

                  {post.isAuthor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction("spoiler");
                        }}
                        className="py-3 px-4 rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 cursor-pointer"
                      >
                        <EyeOff className="h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110" />
                        {post.spoiler
                          ? t("post.remove_spoiler")
                          : t("post.add_spoiler")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        disabled={disablePin}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction("pin");
                        }}
                        className="py-3 px-4 rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 cursor-pointer disabled:opacity-50"
                      >
                        <Pin
                          className={cn(
                            "h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110",
                            post.isPinned && "fill-current text-brand",
                          )}
                        />
                        {post.isPinned ? t("post.unpin") : t("post.pin")}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                        {t("post.delete")}
                      </DropdownMenuItem>
                    </>
                  )}

                  {!post.isAuthor && (
                    <>
                      {canModeratorDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMenuOpen(false);
                              setIsModDeleteModalOpen(true);
                            }}
                            className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                            {getModDeleteLabel()}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5 cursor-pointer justify-between"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuView("report");
                        }}
                      >
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                          {t("post.report")}
                        </div>
                        <ChevronRight className="h-4 w-4 text-foreground-40" />
                      </DropdownMenuItem>
                    </>
                  )}
                </div>

                <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
                  <div className="flex items-center border-b border-surface-border">
                    <button
                      onClick={() => setMenuView("main")}
                      className="self-stretch pl-4 pr-3 flex items-center justify-center cursor-pointer flex-shrink-0 transition-transform duration-150 active:scale-95 text-foreground-60"
                    >
                      <ChevronLeft className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
                    </button>
                    <span className="text-sm font-bold text-foreground-60 py-3">
                      {t("post.report")}
                    </span>
                  </div>

                  <DropdownMenuItem
                    className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer"
                    onClick={() =>
                      openReportModal({
                        targetType: "POST", // 1. Post -> Community
                        targetId: post.id,
                        targetName: post.title,
                        targetAuthorName: post.authorUsername,
                        communityContextId: post.communityId || undefined,
                      })
                    }
                  >
                    <Flag className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                    {post.communityId
                      ? t("post.report_post_community")
                      : t("post.report_post_global")}
                  </DropdownMenuItem>

                  {/* ONLY show "Report User to Community" if inside a community */}
                  {post.communityId && (
                    <DropdownMenuItem
                      disabled={!canReportPostAuthor}
                      className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer disabled:opacity-50"
                      onClick={() => {
                        if (!canReportPostAuthor) return;
                        const communityContextId: string | undefined =
                          post.communityId ?? undefined;
                        openReportModal({
                          targetType: "USER", // 2. User -> Community
                          targetId: post.authorId!,
                          targetName: post.authorUsername,
                          targetAuthorName: post.authorUsername,
                          communityContextId,
                          postContextId: post.id,
                        });
                      }}
                    >
                      <Flag className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                      {t("post.report_user_community")}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    disabled={!canReportPostAuthor}
                    className="py-3 px-4 rounded-none w-full text-brand! font-medium group/item hover:bg-foreground/5 cursor-pointer disabled:opacity-50"
                    onClick={() => {
                      if (!canReportPostAuthor) return;
                      openReportModal({
                        targetType: "USER", // 3. User -> Global Admin
                        targetId: post.authorId!,
                        targetName: post.authorUsername,
                        targetAuthorName: post.authorUsername,
                        postContextId: post.id,
                      });
                    }}
                  >
                    <Flag className="h-4 w-4 mr-2.5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                    {t("post.report_user_global")}
                  </DropdownMenuItem>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Report Modal */}
      {!post.isAuthor && reportTarget && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportTarget(null);
          }}
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          targetName={reportTarget.targetName}
          targetAuthorName={reportTarget.targetAuthorName}
          communityContextId={reportTarget.communityContextId}
          postContextId={reportTarget.postContextId}
        />
      )}

      {canModeratorDelete && (
        <DeleteContentModal
          isOpen={isModDeleteModalOpen}
          onOpenChange={setIsModDeleteModalOpen}
          title={t("communityPage.delete_post_title").replace(
            "{{title}}",
            post.title ?? "",
          )}
          description={t("communityPage.delete_post_desc")}
          successMessage={t("post.delete_mod_success_post").replace(
            "{{username}}",
            post.authorUsername || "",
          )}
          showReason={true}
          reason={modDeleteReason}
          onReasonChange={setModDeleteReason}
          reasonLabel={t("communityPage.delete_post_reason_label")}
          onConfirm={handleModeratorDelete}
          onSuccessComplete={handleModeratorDeleteSuccess}
          confirmLabel={t("communityPage.confirm_delete_post")}
          confirmingLabel={t("communityPage.deleting_post")}
        />
      )}
    </>
  );
}
