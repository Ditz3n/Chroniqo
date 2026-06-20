// src/app/[locale]/(protected)/communities/[name]/members/(components)/members-tabs.tsx
"use client";

import { BanMuteModal } from "@/components/moderation/ban-mute-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  ApiCommunityBan,
  ApiCommunityMember,
  ApiCommunityMute,
  CommunityMembersResponse,
  isMemberRole,
  MembersTabsProps,
  TabKey,
} from "@/types/app-types";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { KickUserModal } from "./kick-user-modal";
import { MemberCard } from "./member-card";
import { PendingRequestsTab } from "./pending-requests-tab";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toMembersResponse = (payload: unknown): CommunityMembersResponse => {
  const candidate =
    isRecord(payload) && isRecord(payload.members) ? payload.members : payload;

  if (!isRecord(candidate)) {
    return { members: [], pending: [], muted: [], banned: [] };
  }

  return {
    members: Array.isArray(candidate.members)
      ? (candidate.members as ApiCommunityMember[])
      : [],
    pending: Array.isArray(candidate.pending)
      ? (candidate.pending as ApiCommunityMember[])
      : [],
    muted: Array.isArray(candidate.muted)
      ? (candidate.muted as ApiCommunityMute[])
      : [],
    banned: Array.isArray(candidate.banned)
      ? (candidate.banned as ApiCommunityBan[])
      : [],
  };
};

const fetcher = async (url: string): Promise<CommunityMembersResponse> => {
  const res = await fetch(url);
  const json: unknown = await res.json();

  if (!res.ok) {
    if (isRecord(json) && typeof json.error === "string") {
      throw new Error(json.error);
    }
    throw new Error("Failed to fetch members");
  }

  return toMembersResponse(json);
};

export function MembersTabs({
  communityName,
  currentUserId,
  isGlobalAdmin,
}: MembersTabsProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("members");
  const [anonPreviewIds, setAnonPreviewIds] = useState<Set<string>>(new Set());

  const toggleAnonPreview = (userId: string) => {
    setAnonPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"ban" | "mute">("ban");
  const [modalTargetId, setModalTargetId] = useState("");
  const [modalTargetUsername, setModalTargetUsername] = useState("");
  const [isKickModalOpen, setIsKickModalOpen] = useState(false);
  const [kickTargetId, setKickTargetId] = useState("");
  const [kickTargetUsername, setKickTargetUsername] = useState("");

  const { data, error, isLoading, mutate } = useSWR<CommunityMembersResponse>(
    `/api/communities/${encodeURIComponent(communityName)}/members`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    },
  );

  const handleKick = (userId: string, username: string) => {
    setKickTargetId(userId);
    setKickTargetUsername(username);
    setIsKickModalOpen(true);
  };

  const handleConfirmKick = async (reason: string | null) => {
    // Optimistic update
    mutate((currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        members: currentData.members.filter((m) => m.userId !== kickTargetId),
      };
    }, false);

    await fetch(
      `/api/communities/${encodeURIComponent(communityName)}/members/${kickTargetId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    mutate();
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!isMemberRole(newRole)) return;

    mutate((currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        members: currentData.members.map((m) =>
          m.userId === userId ? { ...m, role: newRole } : m,
        ),
      };
    }, false);

    await fetch(
      `/api/communities/${encodeURIComponent(communityName)}/members/${userId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      },
    );
    mutate();
  };

  const handleOpenModal = (
    userId: string,
    username: string,
    type: "ban" | "mute",
  ) => {
    setModalTargetId(userId);
    setModalTargetUsername(username);
    setModalAction(type);
    setIsModalOpen(true);
  };

  const handleConfirmBanMute = async (
    action: "ban" | "mute",
    durationHours: number | null,
    reason: string | null,
  ) => {
    // Optimistic UI updates
    mutate((currentData) => {
      if (!currentData) return currentData;
      const targetMember = currentData.members.find(
        (m) => m.userId === modalTargetId,
      );
      if (!targetMember) return currentData;

      if (action === "ban") {
        return {
          ...currentData,
          members: currentData.members.filter(
            (m) => m.userId !== modalTargetId,
          ),
          banned: [
            ...currentData.banned,
            {
              userId: modalTargetId,
              reason,
              expiresAt: null,
              createdAt: new Date().toISOString(),
              user: targetMember.user,
            },
          ],
        };
      } else {
        // Mute
        return {
          ...currentData,
          members: currentData.members.map((m) =>
            m.userId === modalTargetId ? { ...m, isMuted: true } : m,
          ),
          muted: [
            ...currentData.muted,
            {
              userId: modalTargetId,
              reason,
              expiresAt: null,
              createdAt: new Date().toISOString(),
              user: targetMember.user,
            },
          ],
        };
      }
    }, false);

    await fetch(
      `/api/communities/${encodeURIComponent(communityName)}/members/${modalTargetId}/${action}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationHours, reason }),
      },
    );
    mutate();
  };

  const handleUnmute = async (userId: string) => {
    mutate((currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        muted: currentData.muted.filter((m) => m.userId !== userId),
        members: currentData.members.map((m) =>
          m.userId === userId ? { ...m, isMuted: false } : m,
        ),
      };
    }, false);
    await fetch(
      `/api/communities/${encodeURIComponent(communityName)}/members/${userId}/mute`,
      { method: "DELETE" },
    );
    mutate();
  };

  const handleUnban = async (userId: string) => {
    mutate((currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        banned: currentData.banned.filter((m) => m.userId !== userId),
      };
    }, false);
    await fetch(
      `/api/communities/${encodeURIComponent(communityName)}/members/${userId}/ban`,
      { method: "DELETE" },
    );
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground-40">
        <Users className="h-12 w-12 opacity-30 mb-4" />
        <p className="text-sm font-medium">
          {t("communityPage.members_error")}
        </p>
      </div>
    );
  }

  const { members, pending, muted, banned } = toMembersResponse(data);
  const currentUserMember = members.find((m) => m.user.id === currentUserId);
  const viewerRole = isGlobalAdmin
    ? "SYSTEM_ADMIN"
    : currentUserMember?.role || null;

  const tabs: { id: TabKey; labelKey: string }[] = [
    { id: "members", labelKey: "communityPage.tab_members" },
    { id: "pending", labelKey: "communityPage.tab_pending" },
    { id: "muted", labelKey: "communityPage.tab_muted" },
    { id: "banned", labelKey: "communityPage.tab_banned" },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Tab bar */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-6">
        <Link
          href={`/${locale}/communities/${encodeURIComponent(communityName)}`}
          className="inline-flex items-center gap-1 px-3 sm:px-4 py-3 text-sm font-bold text-foreground-60 hover:text-foreground transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("communityPage.back_to_community")}
        </Link>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-foreground-60 hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
            {tab.id === "pending" && pending.length > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-none">
                {pending.length > 9 ? "+9" : pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col sm:block">
        {activeTab === "members" &&
          (members.length > 0 ? (
            members.map((member) => (
              <MemberCard
                key={member.user.id}
                member={member}
                viewerRole={viewerRole}
                currentUserId={currentUserId}
                onKick={handleKick}
                onChangeRole={handleChangeRole}
                onOpenBanMuteModal={handleOpenModal}
                onUnmute={handleUnmute}
                useAnonPreview={anonPreviewIds.has(member.userId)}
                onToggleAnonPreview={toggleAnonPreview}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-foreground-40">
              <p className="text-sm font-medium">
                {t("communityPage.empty_state")}
              </p>
            </div>
          ))}

        {activeTab === "pending" && (
          <PendingRequestsTab
            pending={pending}
            communityName={communityName}
            onUpdate={() => mutate()}
          />
        )}

        {/* Muted Tab List */}
        {activeTab === "muted" &&
          (muted.length > 0 ? (
            muted.map((m) => (
              <div
                key={m.userId}
                className="group flex items-center justify-between gap-3 px-4 py-3 bg-surface hover:bg-foreground/5 border-b sm:border border-surface-border sm:rounded-2xl sm:mb-3 last:border-b-0 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button, a")) return;
                  if (!m.user.username) return;
                  router.push(
                    `/${locale}/u/${encodeURIComponent(m.user.username)}`,
                  );
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 border border-surface-border">
                    {m.user.image && <AvatarImage src={m.user.image} />}
                    <AvatarFallback className="text-xs bg-background text-foreground">
                      {m.user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate group-hover:underline">
                      {m.user.name ?? m.user.username}
                    </span>
                    <span className="text-xs text-foreground-60 truncate">
                      u/{m.user.username}
                    </span>
                    {m.reason && (
                      <span className="text-xs text-foreground-60 italic mt-0.5 truncate">
                        {m.reason}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnmute(m.userId)}
                  className="text-xs font-bold text-foreground-60 hover:text-foreground cursor-pointer shrink-0"
                >
                  {t("communityPage.unmute")}
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-foreground-40">
              <p className="text-sm font-medium">
                {t("communityPage.empty_muted_members")}
              </p>
            </div>
          ))}

        {/* Banned Tab List */}
        {activeTab === "banned" &&
          (banned.length > 0 ? (
            banned.map((b) => (
              <div
                key={b.userId}
                className="group flex items-center justify-between gap-3 px-4 py-3 bg-surface hover:bg-foreground/5 border-b sm:border border-surface-border sm:rounded-2xl sm:mb-3 last:border-b-0 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button, a")) return;
                  if (!b.user.username) return;
                  router.push(
                    `/${locale}/u/${encodeURIComponent(b.user.username)}`,
                  );
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 border border-surface-border">
                    {b.user.image && <AvatarImage src={b.user.image} />}
                    <AvatarFallback className="text-xs bg-background text-foreground">
                      {b.user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate group-hover:underline">
                      {b.user.name ?? b.user.username}
                    </span>
                    <span className="text-xs text-foreground-60 truncate">
                      u/{b.user.username}
                    </span>
                    {b.reason && (
                      <span className="text-xs text-brand/80 italic mt-0.5 truncate">
                        {b.reason}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnban(b.userId)}
                  className="text-xs font-bold text-brand hover:opacity-80 cursor-pointer shrink-0"
                >
                  {t("communityPage.unban")}
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-foreground-40">
              <p className="text-sm font-medium">
                {t("communityPage.empty_banned_members")}
              </p>
            </div>
          ))}
      </div>

      <BanMuteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmBanMute}
        actionType={modalAction}
        targetUsername={modalTargetUsername}
      />

      <KickUserModal
        isOpen={isKickModalOpen}
        onClose={() => setIsKickModalOpen(false)}
        onConfirm={handleConfirmKick}
        targetUsername={kickTargetUsername}
        communityName={communityName}
      />
    </div>
  );
}
