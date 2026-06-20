// src/app/[locale]/(protected)/u/[username]/[postId]/[commentId]/page.tsx
"use client";

import { IsolatedCommentView } from "@/app/[locale]/(protected)/(components)/comments/isolated-comment-view";
import { useParams } from "next/navigation";

export default function ProfileIsolatedCommentPage() {
  const params = useParams();
  const username = params.username as string;
  const postId = params.postId as string;
  const commentId = params.commentId as string;
  const locale = params.locale as string;

  return (
    <div className="flex w-full min-h-full py-6 justify-center">
      <div className="flex flex-col w-full px-4 sm:px-6">
        <IsolatedCommentView
          postId={postId}
          commentId={commentId}
          backUrl={`/${locale}/u/${username}/${postId}`}
        />
      </div>
    </div>
  );
}
