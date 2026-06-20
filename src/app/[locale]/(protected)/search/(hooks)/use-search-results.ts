// src/app/[locale]/(protected)/search/(hooks)/use-search-results.ts
"use client";

import { cacheKeys } from "@/lib/cache-keys";
import { timeAgo } from "@/lib/utils/time";
import {
  PollOption,
  Post,
  PostMetadata,
  SearchApiPost,
  SearchCommunityResult,
  SearchGlobalResponse,
  SearchResponse,
  SearchUserResult,
  UseSearchResultsParams,
  UseSearchResultsReturn,
} from "@/types/app-types";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Search failed");
    return r.json();
  });

// Exported so Jest can test all 6 post type branches without mounting the hook
export function mapSearchApiPostToPost(
  post: SearchApiPost,
  viewerId: string,
): Post {
  const metadata = (post.metadata ?? {}) as PostMetadata;

  const base = {
    id: post.id,
    authorId: post.authorId,
    communityId: post.communityId,
    community: post.community?.name ?? "Profile",
    communityAvatar: post.community?.image ?? undefined,
    author: post.isAnonymous
      ? "Anonymous"
      : (post.author.name ?? post.author.username ?? "Unknown"),
    authorUsername: post.isAnonymous
      ? "anonymous"
      : (post.author.username ?? ""),
    // Uses the shared timeAgo utility - same function used by usePosts
    timeAgo: timeAgo(post.createdAt),
    supports: post.supports,
    comments: post.comments,
    userSupported: post.userSupported,
    title: post.title,
    isSaved: post.isSaved,
    isHidden: post.isHidden,
    isPinned: post.isPinned,
    isAuthor: post.authorId === viewerId,
    isAnonymous: post.isAnonymous,
    spoiler: (metadata.spoiler as boolean | undefined) ?? false,
  };

  switch (post.type) {
    case "image":
      return {
        ...base,
        type: "image",
        images: (metadata.images as string[] | undefined) ?? [],
      };
    case "video":
      return {
        ...base,
        type: "video",
        videoUrl: (metadata.videoUrl as string | undefined) ?? "",
        thumbnailUrl: (metadata.thumbnailUrl as string | undefined) ?? "",
        duration: (metadata.duration as number | undefined) ?? 0,
      };
    case "youtube":
      return {
        ...base,
        type: "youtube",
        videoId: (metadata.videoId as string | undefined) ?? "",
      };
    case "link":
      return {
        ...base,
        type: "link",
        url: (metadata.url as string | undefined) ?? "",
        siteName: (metadata.siteName as string | undefined) ?? "",
        metaTitle: (metadata.metaTitle as string | undefined) ?? "",
        metaDescription: (metadata.metaDescription as string | undefined) ?? "",
        metaImage: (metadata.metaImage as string | undefined) ?? "",
      };
    case "poll":
      return {
        ...base,
        type: "poll",
        content: post.content,
        options: (metadata.options as PollOption[] | undefined) ?? [],
        closesAt: (metadata.closesAt as string | undefined) ?? "",
        isClosed: metadata.closesAt
          ? new Date(metadata.closesAt as string) < new Date()
          : false,
        userVote: (metadata.userVote as string | null | undefined) ?? null,
        totalVotes: (metadata.totalVotes as number | undefined) ?? 0,
      };
    default:
      return { ...base, type: "text", body: post.content ?? "" };
  }
}

function buildSwrKey(
  query: string,
  type: "global" | "community" | "user",
  scope?: string,
  section?: string,
): string | null {
  if (!query.trim()) return null;

  if (type === "global") {
    const base = cacheKeys.search.global(query.trim());
    // Append section to key so SWR treats global vs global+section as separate caches
    return section ? `${base}&section=${section}` : base;
  }
  if (type === "community" && scope) {
    return cacheKeys.search.community(query.trim(), scope);
  }
  if (type === "user" && scope) {
    return cacheKeys.search.user(query.trim(), scope);
  }
  return null;
}

export function useSearchResults({
  query,
  type,
  scope,
  section,
}: UseSearchResultsParams): UseSearchResultsReturn {
  const { data: session } = useSession();
  const viewerId = session?.user?.id ?? "";

  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());

  const swrKey = buildSwrKey(query, type, scope, section);
  const { data, isLoading } = useSWR<SearchResponse>(swrKey, fetcher);

  const users: SearchUserResult[] = (data as SearchGlobalResponse)?.users ?? [];
  const communities: SearchCommunityResult[] =
    (data as SearchGlobalResponse)?.communities ?? [];

  const rawPosts: SearchApiPost[] = data?.posts ?? [];
  const posts: Post[] = rawPosts
    .filter((p: SearchApiPost) => !hiddenPostIds.has(p.id))
    .map((p: SearchApiPost) => mapSearchApiPostToPost(p, viewerId));

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set([...prev, postId]));
  }, []);

  return { users, communities, posts, isLoading, handleHidePost };
}
