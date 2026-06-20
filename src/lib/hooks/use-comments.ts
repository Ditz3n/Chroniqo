// src/lib/hooks/use-comments.ts
"use client";

import { ApiComment } from "@/types/app-types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useComments(postId: string, sort: string = "new") {
  return useSWR<{ comments: ApiComment[] }>(
    `/api/posts/${postId}/comments?sort=${sort}`,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 10000, // Poll every 10 seconds for new comments
    },
  );
}

export function useIsolatedComment(commentId: string | null) {
  return useSWR<{ commentThread: ApiComment }>(
    commentId ? `/api/comments/${commentId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 10000,
    },
  );
}
