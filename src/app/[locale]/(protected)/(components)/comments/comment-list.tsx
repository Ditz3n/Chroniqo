// src/app/[locale]/(protected)/(components)/comments/comment-list.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useComments } from "@/lib/hooks/use-comments";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CommentListProps, SortOption } from "@/types/app-types";
import { CommunityRole } from "@prisma/client";
import {
  ChevronDown,
  Flame,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

const SORT_OPTIONS = [
  { value: "best", labelKey: "feed.sort_best", icon: Sparkles },
  { value: "hot", labelKey: "feed.sort_hot", icon: Flame },
  { value: "new", labelKey: "feed.sort_new", icon: Zap },
  { value: "top", labelKey: "feed.sort_top", icon: Star },
  { value: "rising", labelKey: "feed.sort_rising", icon: TrendingUp },
] as const;

export function CommentList({
  postId,
  postAuthorId,
  isPostAnonymous,
  communityId,
  viewerCommunityRole = null,
}: CommentListProps & { viewerCommunityRole?: CommunityRole | null }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortOption>("new");

  const { data, isLoading, error } = useComments(postId, sort);
  const comments = data?.comments || [];

  const currentSort = SORT_OPTIONS.find((s) => s.value === sort)!;
  const SortIcon = currentSort.icon;

  return (
    <div className="flex flex-col w-full relative my-6">
      {/* Top-Level Reply Form */}
      <CommentForm postId={postId} communityId={communityId} />

      {/* Sort Dropdown */}
      <div className="flex items-center justify-start mt-4 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-surface-border bg-surface hover:bg-foreground/8 text-foreground-60 hover:text-foreground text-sm font-semibold transition-all cursor-pointer focus:outline-none data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground">
              <SortIcon className="h-4 w-4" />
              <span>{t(currentSort.labelKey)}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0"
          >
            <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
              {t("feed.sort_by")}
            </DropdownMenuLabel>
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = sort === opt.value;
              return (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={cn(
                    "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5",
                    isActive && "text-foreground bg-foreground/5",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110",
                      isActive && "text-brand",
                    )}
                  />
                  {t(opt.labelKey)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Comment Thread */}
      <div className="flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-brand text-sm font-medium">
            {t("post.comments_error")}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-40  mt-2">
            <p className="text-sm font-medium">{t("post.no_comments")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-2">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postAuthorId={postAuthorId}
                isPostAnonymous={isPostAnonymous}
                communityId={communityId}
                viewerCommunityRole={viewerCommunityRole}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
