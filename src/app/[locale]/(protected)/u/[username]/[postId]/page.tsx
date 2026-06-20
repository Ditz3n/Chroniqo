// src/app/[locale]/(protected)/u/[username]/[postId]/page.tsx
"use client";

import { SinglePostView } from "@/app/[locale]/(protected)/(components)/posts/single-post-view";
import { useParams } from "next/navigation";

export default function ProfilePostPage() {
  const params = useParams();
  const username = params.username as string;
  const postId = params.postId as string;
  const locale = params.locale as string;

  return (
    <div className="flex w-full min-h-full py-6 justify-center">
      <div className="flex flex-col w-full px-4 sm:px-6">
        <SinglePostView
          postId={postId}
          backUrl={`/${locale}/u/${username}`}
          backLabelKey="profile.back_to_profile"
        />
      </div>
    </div>
  );
}
