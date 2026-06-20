// src/app/[locale]/(protected)/u/[username]/(components)/profile-comment-list.tsx
"use client";

import { CommentRenderer } from "@/app/[locale]/(protected)/(components)/posts/comment-renderer";
import { useTranslation } from "@/lib/hooks/use-translation";
import { timeAgo } from "@/lib/utils/time";
import { ProfileCommentData } from "@/types/app-types";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ProfileCommentList({
  username,
  sort,
}: {
  username: string;
  sort: string;
}) {
  const { t, locale } = useTranslation();
  const { data, isLoading, error } = useSWR(
    `/api/users/${username}/comments?sort=${sort}`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.comments) {
    return (
      <div className="text-center py-12 text-brand text-sm font-medium">
        {t("profile.comments_error")}
      </div>
    );
  }

  const comments = data.comments;

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface border border-surface-border rounded-2xl text-foreground-40 origin-top animate-feed-empty-unfold">
        <p className="text-sm font-medium">{t("profile.no_comments")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {comments.map((apiComment: ProfileCommentData) => {
        // Map to the CommentMock format expected by CommentRenderer
        const mockFormat = {
          id: apiComment.id,
          community: apiComment.post.community?.name
            ? `c/${apiComment.post.community.name}`
            : "Profile",
          communityAvatar: apiComment.post.community?.image || undefined,
          postTitle: apiComment.post.title,
          author: `u/${apiComment.author.username}`,
          timeAgo: timeAgo(apiComment.createdAt),
          content: apiComment.content,
          deletedAt: apiComment.deletedAt,
          supports: apiComment._count?.supportedBy || 0,
        };

        const postUrl = apiComment.post.community
          ? `/${locale}/communities/${apiComment.post.community.name}/${apiComment.post.id}/${apiComment.id}`
          : `/${locale}/u/${apiComment.post.author.username}/${apiComment.post.id}/${apiComment.id}`;

        return (
          <Link href={postUrl} key={apiComment.id} className="block group">
            <CommentRenderer comment={mockFormat} />
          </Link>
        );
      })}
    </div>
  );
}
