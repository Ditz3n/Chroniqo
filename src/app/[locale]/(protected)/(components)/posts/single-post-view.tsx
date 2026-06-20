// src/app/[locale]/(protected)/(components)/posts/single-post-view.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { mapApiPostToUi } from "@/lib/utils/post-mappers";
import { timeAgo } from "@/lib/utils/time";
import { ApiPost, SinglePostViewProps } from "@/types/app-types";
import { CommunityRole } from "@prisma/client";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { CommentList } from "../comments/comment-list";
import { PostRenderer } from "./post-renderer";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch post");
    return res.json();
  });

export function SinglePostView({
  postId,
  backUrl,
  backLabelKey,
}: SinglePostViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, error } = useSWR<{ post: ApiPost }>(
    `/api/posts/${postId}`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data?.post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h3 className="text-xl font-bold font-heading text-foreground mb-2">
          {t("post.not_found_title")}
        </h3>
        <p className="text-sm text-foreground-60 mb-6">
          {t("post.not_found_desc")}
        </p>
        <button
          onClick={() => router.push(backUrl)}
          className="px-6 py-2 rounded-full bg-surface border border-surface-border text-sm font-semibold hover:bg-foreground/5 transition-colors cursor-pointer"
        >
          {t(backLabelKey)}
        </button>
      </div>
    );
  }

  const apiPost = data.post;
  const uiPost = mapApiPostToUi(apiPost, timeAgo, apiPost.isAuthor ?? false);

  // viewerCommunityRole is populated by getPostById when the viewer holds a
  // moderator/admin/owner role in the post's community. Passed down to
  // CommentList -> CommentItem to unlock the moderation delete option.
  const viewerCommunityRole =
    (apiPost as ApiPost & { viewerCommunityRole?: CommunityRole | null })
      .viewerCommunityRole ?? null;

  return (
    <div className="flex flex-col items-center w-full pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-[800px]">
        <div className="mb-4">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors w-fit px-2 py-1 -ml-2 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            {t(backLabelKey)}
          </button>
        </div>

        <PostRenderer
          post={uiPost}
          layout="card"
          onHideDelete={() => router.push(backUrl)}
          isSingleView={true}
        />

        <CommentList
          postId={apiPost.id}
          postAuthorId={apiPost.author.id}
          isPostAnonymous={apiPost.isAnonymous}
          communityId={apiPost.community?.id}
          viewerCommunityRole={viewerCommunityRole}
        />
      </div>
    </div>
  );
}
