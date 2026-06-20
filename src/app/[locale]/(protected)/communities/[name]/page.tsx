// src/app/[locale]/(protected)/communities/[name]/page.tsx
"use client";

import { FeedHeader } from "@/app/[locale]/(protected)/feed/(components)/feed-header";
import { PostFeed } from "@/app/[locale]/(protected)/feed/(components)/post-feed";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ApiCommunityDetail, PostLayout, SortOption } from "@/types/app-types";
import { Ban, Lock, UserX } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { CommunityHeader } from "./(components)/community-header";
import { CommunitySidebar } from "./(components)/community-sidebar";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch community");
    return res.json();
  });

export default function CommunityPage() {
  const { t } = useTranslation();
  const params = useParams();
  const name = params.name as string;
  const { data: session } = useSession();

  const [layout, setLayout] = useState<PostLayout>("card");
  const [sort, setSort] = useState<SortOption>("new");

  const { data, error, isLoading, mutate } = useSWR<{
    community: ApiCommunityDetail;
  }>(name ? `/api/communities/${encodeURIComponent(name)}` : null, fetcher);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data?.community) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 text-foreground-60">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {t("communityPage.not_found_title")}
        </h1>
        <p>{t("communityPage.not_found_desc")}</p>
      </div>
    );
  }

  const community = data.community;

  // Privacy Check: Private communities hide feed from non-members, UNLESS user is a Global Admin
  const isPrivateLocked =
    community.isPrivate &&
    community.membership.status !== "ACCEPTED" &&
    session?.user?.role !== "ADMIN";

  const isBanned = community.isBanned;
  const isBlockedByMe = community.isBlockedByMe;

  return (
    <div className="flex w-full min-h-full justify-center pb-12 pt-6">
      <div
        className={cn(
          "flex flex-col w-full",
          layout === "compact"
            ? "px-3 sm:px-5"
            : "max-w-[1100px] px-4 sm:px-6 mx-auto",
        )}
      >
        {/* Full-width Header */}
        <CommunityHeader
          community={community}
          isPersonallyHidden={community.isPersonallyHidden}
          onUpdate={mutate}
        />

        <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1fr_312px] gap-8 w-full mt-2">
          {/* Main Feed Column */}
          <div className="flex flex-col min-w-0 w-full order-2 min-[1080px]:order-1">
            {isBlockedByMe ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-surface-border rounded-2xl">
                <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                  <UserX className="h-8 w-8 text-brand" />
                </div>
                <h3 className="text-xl font-bold font-heading text-foreground mb-2">
                  {t("communityPage.blocked_title")}
                </h3>
                <p className="text-sm text-foreground-60 max-w-sm">
                  {t("communityPage.blocked_desc")}
                </p>
              </div>
            ) : isBanned ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-surface-border rounded-2xl">
                <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                  <Ban className="h-8 w-8 text-brand" />
                </div>
                <h3 className="text-xl font-bold font-heading text-foreground mb-2">
                  {t("communityPage.banned_title")}
                </h3>
                <p className="text-sm text-foreground-60 max-w-sm">
                  {t("communityPage.banned_desc")}
                </p>
              </div>
            ) : isPrivateLocked ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-surface-border rounded-2xl">
                <div className="h-16 w-16 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
                  <Lock className="h-8 w-8 text-foreground-60" />
                </div>
                <h3 className="text-xl font-bold font-heading text-foreground mb-2">
                  {t("communityPage.private_notice")}
                </h3>
                <p className="text-sm text-foreground-60 max-w-sm">
                  {t("communityPage.private_notice_desc")}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-start">
                  <FeedHeader
                    layout={layout}
                    sort={sort}
                    onLayoutChange={setLayout}
                    onSortChange={setSort}
                  />
                </div>
                <PostFeed
                  layout={layout}
                  sort={sort}
                  communityName={community.name}
                />
              </>
            )}
          </div>

          {/* Right Sidebar Column */}
          <div className="order-1 min-[1080px]:order-2">
            <CommunitySidebar community={community} onUpdate={mutate} />
          </div>
        </div>
      </div>
    </div>
  );
}
