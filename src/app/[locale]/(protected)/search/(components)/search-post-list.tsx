// src/app/[locale]/(protected)/search/(components)/search-post-list.tsx
"use client";

import { PostRenderer } from "@/app/[locale]/(protected)/(components)/posts/post-renderer";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Post, SearchPostListProps } from "@/types/app-types";
import { useRouter } from "next/navigation";

export function SearchPostList({
  posts,
  locale,
  onHidePost,
  query,
}: SearchPostListProps) {
  const { t } = useTranslation();
  const router = useRouter();

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface border border-surface-border rounded-2xl text-foreground-40">
        <p className="text-sm font-medium">
          {t("search.empty_posts").replace("{{query}}", query)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post: Post) => {
        const postUrl = post.communityId
          ? `/${locale}/communities/${post.community}/${post.id}`
          : `/${locale}/u/${post.authorUsername}/${post.id}`;

        return (
          <div
            key={post.id}
            onClick={() => router.push(postUrl)}
            className="group/postcard relative cursor-pointer rounded-2xl will-change-transform animate-post-enter"
          >
            <PostRenderer
              post={post}
              layout="card"
              hasPinnedPostInFeed={false}
              onHideDelete={() => onHidePost(post.id)}
            />
            <div className="absolute inset-0 rounded-2xl pointer-events-none transition-colors duration-150 group-hover/postcard:bg-foreground/[0.04]" />
          </div>
        );
      })}
    </div>
  );
}
