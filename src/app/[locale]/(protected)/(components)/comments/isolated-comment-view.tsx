// src/app/[locale]/(protected)/(components)/comments/isolated-comment-view.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { mapApiPostToUi } from "@/lib/utils/post-mappers";
import { timeAgo } from "@/lib/utils/time";
import {
  ApiComment,
  ApiPost,
  IsolatedCommentViewProps,
} from "@/types/app-types";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PostRenderer } from "../posts/post-renderer";
import { CommentItem } from "./comment-item";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function IsolatedCommentView({
  postId,
  commentId,
  backUrl,
}: IsolatedCommentViewProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: postData, isLoading: postLoading } = useSWR<{ post: ApiPost }>(
    `/api/posts/${postId}`,
    fetcher,
  );
  const { data: commentData, isLoading: commentLoading } = useSWR<{
    commentThread: ApiComment;
  }>(`/api/comments/${commentId}`, fetcher);

  if (postLoading || commentLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!postData?.post || !commentData?.commentThread) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h3 className="text-xl font-bold font-heading text-foreground mb-2">
          {t("post.isolated_not_found")}
        </h3>
        <button
          onClick={() => router.push(backUrl)}
          className="mt-4 px-6 py-2 rounded-full bg-surface border border-surface-border text-sm font-semibold hover:bg-foreground/5 transition-colors cursor-pointer"
        >
          {t("post.view_all_comments")}
        </button>
      </div>
    );
  }

  const apiPost = postData.post;
  const uiPost = mapApiPostToUi(apiPost, timeAgo, apiPost.isAuthor ?? false);

  return (
    <div className="flex flex-col w-full max-w-[800px] mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <button
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors w-fit px-4 py-2 -ml-2 rounded-full cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("post.show_full_post")}
        </button>
      </div>

      <PostRenderer
        post={uiPost}
        layout="card"
        onHideDelete={() => router.push(backUrl)}
      />

      <div className="flex flex-col gap-6 w-full pt-6 mt-2 relative">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-heading font-bold text-lg text-foreground">
            {t("post.single_thread")}
          </h3>
        </div>

        <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 -mt-2">
          <CommentItem
            comment={commentData.commentThread}
            postAuthorId={apiPost.author.id}
            isPostAnonymous={apiPost.isAnonymous}
          />
        </div>
      </div>
    </div>
  );
}
