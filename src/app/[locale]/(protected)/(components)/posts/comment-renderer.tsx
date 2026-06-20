// src/app/[locale]/(protected)/(components)/posts/comment-renderer.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { CommentRendererProps } from "@/types/app-types";
import { Heart, MessageCircle } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

export function CommentRenderer({ comment }: CommentRendererProps) {
  const { t } = useTranslation();
  const initials = comment.community
    .replace("c/", "")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-2 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors bg-surface sm:rounded-2xl sm:border sm:mb-1.5">
      {/* Top Context Row */}
      <div className="flex items-center gap-2 text-xs text-foreground-60">
        <div className="h-5 w-5 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
          {comment.communityAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={comment.communityAvatar}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : (
            <span className="text-[8px] font-bold text-brand">{initials}</span>
          )}
        </div>
        <span className="font-semibold text-foreground-67">
          {comment.community}
        </span>
        <span>•</span>
        <span className="truncate max-w-[200px]">{comment.postTitle}</span>
      </div>

      {/* Author & Time Row */}
      <div className="flex items-center gap-1.5 text-xs text-foreground-60">
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">{comment.author}</span>
        <span>{t("profile.commented_on")}</span>
        <span>{comment.timeAgo}</span>
      </div>

      {/* Comment Content */}
      <div className="text-sm text-foreground mt-1">
        {comment.deletedAt ? (
          <span className="italic text-foreground-40 bg-foreground/5 px-2 py-1 rounded-md inline-block">
            {t("post.comment_deleted")}
          </span>
        ) : (
          <MarkdownRenderer content={comment.content} />
        )}
      </div>

      {/* Supports */}
      <div className="flex items-center gap-1.5 mt-1 text-xs text-foreground-60 font-semibold">
        <Heart className="h-3.5 w-3.5" />
        <span>{comment.supports || 0}</span>
        <span>{t("post.supports")}</span>
      </div>
    </div>
  );
}
