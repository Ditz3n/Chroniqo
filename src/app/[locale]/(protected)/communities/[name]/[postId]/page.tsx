// src/app/[locale]/(protected)/communities/[name]/[postId]/page.tsx
"use client";

import { SinglePostView } from "@/app/[locale]/(protected)/(components)/posts/single-post-view";
import { useParams } from "next/navigation";

export default function CommunityPostPage() {
  const params = useParams();
  const name = params.name as string;
  const postId = params.postId as string;
  const locale = params.locale as string;

  return (
    <div className="flex w-full min-h-full py-6 justify-center">
      <div className="flex flex-col w-full px-4 sm:px-6">
        <SinglePostView
          postId={postId}
          backUrl={`/${locale}/communities/${encodeURIComponent(name)}`}
          backLabelKey="communityPage.back_to_community"
        />
      </div>
    </div>
  );
}
