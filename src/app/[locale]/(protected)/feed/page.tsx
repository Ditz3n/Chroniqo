// src/app/[locale]/(protected)/feed/page.tsx
"use client";

import { cn } from "@/lib/utils";
import type { PostLayout, SortOption } from "@/types/app-types";
import { useState } from "react";
import { FeedHeader } from "./(components)/feed-header";
import { PostFeed } from "./(components)/post-feed";
import { RightSideContent } from "./(components)/right-side-content";

export default function FeedPage() {
  const [layout, setLayout] = useState<PostLayout>("card");
  const [sort, setSort] = useState<SortOption>("new"); // Default changed from best to new
  const isCompact = layout === "compact";

  return (
    <div className="expanded-layout flex w-full min-h-full pb-3 md:pb-0 pt-6 justify-center">
      <div
        className={cn(
          "flex flex-col w-full",
          isCompact ? "px-3 sm:px-5" : "max-w-[1100px] px-4 sm:px-6",
        )}
      >
        {/* Feed header - sits above both columns so sidebar and posts start level */}
        <FeedHeader
          layout={layout}
          sort={sort}
          onLayoutChange={setLayout}
          onSortChange={setSort}
        />

        {/* No items-start - columns stretch to equal height, enabling sticky sidebar */}
        <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1fr_312px] gap-8 w-full">
          <div className="flex flex-col min-w-0 w-full">
            <PostFeed layout={layout} sort={sort} />
          </div>
          <div>
            <RightSideContent recentPosts={[]} />
          </div>
        </div>
      </div>
    </div>
  );
}
