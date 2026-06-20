// src/lib/hooks/use-posts.ts
"use client";

import { ApiPost, Post, PostsPage, SortOption } from "@/types/app-types";
import { useSession } from "next-auth/react";
import useSWRInfinite from "swr/infinite";
import { mapApiPostToUi } from "../utils/post-mappers";
import { timeAgo } from "../utils/time";

const fetcher = async (url: string): Promise<PostsPage> => {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body?.error || "Failed to fetch posts");
  }

  return {
    posts: Array.isArray(body?.posts) ? (body.posts as ApiPost[]) : [],
  };
};

export interface UsePostsOptions {
  communityName?: string;
  username?: string;
  tab?: string;
  sort?: SortOption;
}

export function usePosts(options: UsePostsOptions) {
  const { data: session } = useSession();
  const sort = options.sort || "new";

  const getKey = (pageIndex: number, previousPageData: PostsPage | null) => {
    if (previousPageData && previousPageData.posts.length === 0) return null;

    if (options.username) {
      return `/api/users/${options.username}/posts?tab=${options.tab || "posts"}&sort=${sort}&page=${pageIndex + 1}`;
    }
    if (options.communityName) {
      return `/api/communities/${encodeURIComponent(options.communityName)}/posts?sort=${sort}&page=${pageIndex + 1}`;
    }
    return `/api/feed?sort=${sort}&page=${pageIndex + 1}`;
  };

  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      revalidateFirstPage: true,
      revalidateAll: false,
      persistSize: true,
    },
  );

  const posts: Post[] = data
    ? data.flatMap((page) =>
        (page?.posts ?? []).map((post) =>
          mapApiPostToUi(post, timeAgo, session?.user?.id === post.author.id),
        ),
      )
    : [];

  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const firstPagePostsCount = data?.[0]?.posts?.length ?? 0;
  const isEmpty = !!data && firstPagePostsCount === 0;
  const lastPagePostsCount = data?.[data.length - 1]?.posts?.length ?? 0;
  const isReachingEnd = isEmpty || (!!data && lastPagePostsCount < 10);

  return {
    posts,
    error,
    isLoadingMore,
    isLoading,
    size,
    setSize,
    isReachingEnd,
    isEmpty,
    mutate,
  };
}
