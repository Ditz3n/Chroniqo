// src/app/[locale]/(protected)/u/[username]/friends/(components)/friends-tabs.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ProfileTabsProps, TabKey } from "@/types/app-types";
import { ArrowLeft, Lock, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFriends } from "../(hooks)/use-friends";
import { BlockedCard } from "./blocked-card";
import { FriendCard } from "./friend-card";
import { RequestCard } from "./request-card";
import { SentRequestCard } from "./sent-request-card";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-foreground-40">
      <Users className="h-12 w-12 opacity-30 mb-4" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function FriendsTabs({
  profile,
  isOwnProfile,
  onUpdate,
}: ProfileTabsProps & { onUpdate?: () => void }) {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey | "blocked">("friends");

  const isLocked =
    profile.isPrivate &&
    !isOwnProfile &&
    profile.relationshipStatus !== "FRIENDS";

  const {
    data,
    isLoading,
    mutate,
    overrides,
    stableFriends,
    optimisticSent,
    activeFriendsCount,
    sentCount,
    removeFriend,
    reAddFriend,
    cancelFromFriendsList,
    cancelSentRequest,
    respondToRequest,
    unblockUser,
  } = useFriends({ username: profile.username, isLocked, onUpdate });

  // Locked state
  if (isLocked) {
    return (
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-surface-border rounded-2xl">
          <div className="h-16 w-16 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-foreground-60" />
          </div>
          <h3 className="text-xl font-bold font-heading text-foreground mb-2">
            {t("profile.private_profile")}
          </h3>
          <p className="text-sm text-foreground-60">
            {t("profile.private_profile_desc")}
          </p>
        </div>
      </div>
    );
  }

  // Tabs config
  const tabs: { id: TabKey | "blocked"; labelKey: string; count?: number }[] = [
    {
      id: "friends",
      labelKey: "profile.friends_tab_friends",
      count: activeFriendsCount,
    },
  ];
  if (isOwnProfile) {
    tabs.push({
      id: "requests",
      labelKey: "profile.friends_tab_requests",
      count: data?.receivedRequests.length,
    });
    tabs.push({
      id: "sent",
      labelKey: "profile.friends_tab_sent",
      count: sentCount,
    });
    tabs.push({
      id: "blocked",
      labelKey: "profile.friends_tab_blocked",
      count: data?.blockedUsers?.length,
    });
  }
  // Render
  return (
    <div className="flex flex-col w-full">
      {/* Tab bar */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-6">
        <Link
          href={`/${locale}/u/${profile.username}`}
          className="inline-flex items-center gap-1 px-3 sm:px-4 py-3 text-sm font-bold text-foreground-60 hover:text-foreground transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("profile.back_to_profile")}
        </Link>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "requests" || tab.id === "blocked") mutate();
            }}
            className={cn(
              "inline-flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-foreground-60 hover:text-foreground",
            )}
          >
            {t(tab.labelKey) || tab.id}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Friends tab */}
          {activeTab === "friends" && (
            <div className="flex flex-col sm:block">
              {!stableFriends?.length ? (
                <EmptyState message={t("profile.no_friendships")} />
              ) : (
                stableFriends.map((user) => (
                  <FriendCard
                    key={user.id}
                    user={user}
                    isOwnProfile={isOwnProfile}
                    override={
                      user.username ? overrides[user.username] : undefined
                    }
                    onRemove={removeFriend}
                    onReAdd={reAddFriend}
                    onCancelRequest={cancelFromFriendsList}
                  />
                ))
              )}
            </div>
          )}

          {/* Requests tab */}
          {activeTab === "requests" && isOwnProfile && (
            <div className="flex flex-col sm:block">
              {!data?.receivedRequests.length ? (
                <EmptyState message={t("profile.no_pending_requests")} />
              ) : (
                data.receivedRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    requestId={req.id}
                    user={req.sender}
                    onAccept={(id) => respondToRequest(id, "ACCEPT")}
                    onDecline={(id) => respondToRequest(id, "DECLINE")}
                  />
                ))
              )}
            </div>
          )}

          {/* Sent tab */}
          {activeTab === "sent" && isOwnProfile && (
            <div className="flex flex-col sm:block">
              {optimisticSent.length === 0 && !data?.sentRequests.length ? (
                <EmptyState message={t("profile.no_sent_requests")} />
              ) : (
                <>
                  {optimisticSent.map((user) => (
                    <SentRequestCard
                      key={`optimistic-${user.id}`}
                      user={user}
                      override={
                        user.username ? overrides[user.username] : undefined
                      }
                      onCancel={cancelFromFriendsList}
                      onReAdd={reAddFriend}
                      onRemove={removeFriend}
                    />
                  ))}
                  {(data?.sentRequests ?? []).map((req) => (
                    <SentRequestCard
                      key={req.id}
                      user={req.receiver}
                      override={
                        req.receiver.username
                          ? overrides[req.receiver.username]
                          : undefined
                      }
                      onCancel={cancelSentRequest}
                      onReAdd={reAddFriend}
                      onRemove={removeFriend}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Blocked Tab */}
          {activeTab === "blocked" && isOwnProfile && (
            <div className="flex flex-col sm:block">
              {!data?.blockedUsers?.length ? (
                <EmptyState message={t("profile.no_blocked_users")} />
              ) : (
                data.blockedUsers.map((user) => (
                  <BlockedCard
                    key={user.id}
                    user={user}
                    onUnblock={unblockUser}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
