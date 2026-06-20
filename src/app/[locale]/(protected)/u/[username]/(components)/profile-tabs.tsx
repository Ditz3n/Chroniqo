// src/app/[locale]/(protected)/u/[username]/(components)/profile-tabs.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  PostLayout,
  ProfileTabsProps,
  SortOption,
  TabKey,
} from "@/types/app-types";
import { Lock, UserX } from "lucide-react";
import { useState } from "react";
import { FeedHeader } from "../../../feed/(components)/feed-header";
import { PostFeed } from "../../../feed/(components)/post-feed";
import { ProfileCommentList } from "./profile-comment-list";

export function ProfileTabs({ profile, isOwnProfile }: ProfileTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [layout, setLayout] = useState<PostLayout>("card");
  const [sort, setSort] = useState<SortOption>("new");

  const isBlocked = profile.isBlockedByMe || profile.hasBlockedMe;

  const publicTabs: { id: TabKey; labelKey: string }[] = [
    { id: "posts", labelKey: "profile.tab_posts" },
    { id: "comments", labelKey: "profile.tab_comments" },
  ];

  const privateTabs: { id: TabKey; labelKey: string }[] = [
    { id: "saved", labelKey: "profile.tab_saved" },
    { id: "hidden", labelKey: "profile.tab_hidden" },
  ];

  // If blocked, ONLY show the "posts" tab as a shell
  const visibleTabs = isBlocked
    ? [publicTabs[0]]
    : isOwnProfile
      ? [...publicTabs, ...privateTabs]
      : publicTabs;

  const isLocked =
    profile.isPrivate &&
    !isOwnProfile &&
    profile.relationshipStatus !== "FRIENDS";

  if (isLocked && !isBlocked) {
    return (
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-surface-border rounded-2xl">
          <div className="h-16 w-16 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-foreground-60" />
          </div>
          <h3 className="text-xl font-bold font-heading text-foreground mb-2">
            {t("profile.private_profile")}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-foreground-60 hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Feed Controls (only for Post-heavy tabs) */}
      {!isBlocked && (
        <FeedHeader
          layout={layout}
          sort={sort}
          onLayoutChange={setLayout}
          onSortChange={setSort}
        />
      )}

      {/* Content */}
      <div className="w-full pb-16">
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-surface-border rounded-2xl">
            <div className="h-16 w-16 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
              <UserX className="h-8 w-8 text-foreground-60" />
            </div>
            <h3 className="text-xl font-bold font-heading text-foreground mb-2">
              {profile.isBlockedByMe
                ? t("profile.blocked_state_title")
                : t("profile.has_blocked_you_title")}
            </h3>
            <p className="text-sm text-foreground-60">
              {profile.isBlockedByMe
                ? t("profile.blocked_state_desc")
                : t("profile.has_blocked_you_desc")}
            </p>
          </div>
        ) : activeTab === "comments" ? (
          <ProfileCommentList username={profile.username || ""} sort={sort} />
        ) : (
          <PostFeed
            layout={layout}
            sort={sort}
            username={profile.username || undefined}
            tab={activeTab}
          />
        )}
      </div>
    </div>
  );
}
