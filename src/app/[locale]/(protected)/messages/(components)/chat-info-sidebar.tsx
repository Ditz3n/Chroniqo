// src/app/[locale]/(protected)/messages/(components)/chat-info-sidebar.tsx
"use client";

import { BanMuteModal } from "@/components/moderation/ban-mute-modal";
import { MutedInfoModal } from "@/components/moderation/muted-info-modal";
import { RevokeMuteModal } from "@/components/moderation/revoke-mute-modal";
import { ChatAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/ui/role-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import {
  useConversationMinigames,
  useConversations,
} from "@/lib/hooks/use-chat";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  ApiConversation,
  ApiMinigame,
  ChatInfoSidebarProps,
  GameType,
} from "@/types/app-types";
import {
  Bell,
  BellOff,
  Circle,
  Dices,
  Edit2,
  Gamepad2,
  Ghost,
  Hash,
  LogOut,
  MoreVertical,
  Timer,
  Trash2,
  Undo2,
  VolumeX,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { AssignNicknameModal } from "./assign-nickname-modal";
import { EditGroupChatModal } from "./edit-group-chat-modal";
import { ExtendChatModal } from "./extend-chat-modal";
import { GameHistoryModal } from "./minigames/game-history-modal";
import { GameInfoModal } from "./minigames/game-info-modal";
import { GamePlayModal } from "./minigames/game-play-modal";

export function ChatInfoSidebar({
  isOpen,
  onClose,
  chatId,
  conversationMeta,
  onMutate,
  disabled = false,
}: ChatInfoSidebarProps) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const { data: convData, mutate: mutateConversations } = useConversations();

  const conversation: ApiConversation | undefined =
    convData?.conversations?.find((c: ApiConversation) => c.id === chatId) ||
    convData?.communityConversations?.find(
      (c: ApiConversation) => c.id === chatId,
    );

  const myParticipant = conversation?.participants?.find(
    (p) => p.user.id === session?.user?.id,
  );

  const [isMuted, setIsMuted] = useState(myParticipant?.isMuted ?? false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Sync state if it changes externally
  useEffect(() => {
    if (myParticipant?.isMuted !== undefined) {
      setIsMuted(myParticipant.isMuted);
    }
  }, [myParticipant?.isMuted]);

  const [nicknameTarget, setNicknameTarget] = useState<{
    id: string;
    current: string;
    name: string;
    username: string;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [muteLoadingId, setMuteLoadingId] = useState<string | null>(null);
  const [anonPreviewIds, setAnonPreviewIds] = useState<Set<string>>(new Set());

  const [showMyMuteModal, setShowMyMuteModal] = useState(false);

  // State for revoking an existing mute
  const [revokeMuteTarget, setRevokeMuteTarget] = useState<{
    userId: string;
    username: string;
  } | null>(null);

  // State for creating a new mute
  const [muteTarget, setMuteTarget] = useState<{
    userId: string;
    username: string;
  } | null>(null);

  const toggleAnonPreview = (userId: string) => {
    setAnonPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const ANIM_MS = 220;
  const [animState, setAnimState] = useState<
    "hidden" | "entering" | "active" | "exiting"
  >("hidden");

  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      const t1 = setTimeout(() => setAnimState("entering"), 0);
      const t2 = setTimeout(() => setAnimState("active"), ANIM_MS);
      // Prevent background scrolling when mobile overlay is active
      if (isMobile) document.body.style.overflow = "hidden";

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        document.body.style.overflow = "";
      };
    } else {
      setConfirmDelete(false);
      document.body.style.overflow = "";
    }
  }, [isOpen, isMobile]);

  const handleClose = () => {
    setAnimState("exiting");
    setTimeout(() => {
      setAnimState("hidden");
      onClose();
    }, ANIM_MS);
  };

  const { mutate: globalMutate } = useSWRConfig();

  const participants = conversation?.participants || [];
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user.id === session?.user?.id) return -1;
    if (b.user.id === session?.user?.id) return 1;
    return 0;
  });

  const isGroup = participants.length > 2;
  const isCommunityChat = !!conversation?.isCommunity;
  const isGlobalAdmin = session?.user?.role === "ADMIN";

  // Current user's community role - determines kick permissions and own leave ability
  const myRole = isCommunityChat
    ? (conversation?.community?.members?.find(
        (m) => m.userId === session?.user?.id,
      )?.role ?? null)
    : null;

  const isPrivilegedViewer =
    isGlobalAdmin || ["OWNER", "ADMIN", "MODERATOR"].includes(myRole ?? "");
  const canKickOthers = isCommunityChat ? isPrivilegedViewer : isGroup;
  const isOwner = myRole === "OWNER";

  // Sorted community members: current user first, then by role rank
  const roleOrder: Record<string, number> = {
    OWNER: 0,
    ADMIN: 1,
    MODERATOR: 2,
    USER: 3,
  };

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  // Minigame sidebar state - only rendered for 1-on-1 direct chats
  const isDirect = !isCommunityChat && !isGroup;
  const { data: activeGamesData } = useConversationMinigames(
    isDirect ? chatId : null,
  );
  const activeGames: ApiMinigame[] = activeGamesData?.games ?? [];
  const [sidebarGameInfoModal, setSidebarGameInfoModal] = useState<{
    game: ApiMinigame;
  } | null>(null);
  const [sidebarGamePlayModal, setSidebarGamePlayModal] =
    useState<ApiMinigame | null>(null);
  const [sidebarGameHistoryModal, setSidebarGameHistoryModal] = useState<{
    opponentId: string;
    opponentUsername: string;
  } | null>(null);

  const joinedUserIds = new Set(participants.map((p) => p.user.id));
  const sortedCommunityMembers: NonNullable<
    ApiConversation["community"]
  >["members"] = isCommunityChat
    ? [...(conversation?.community?.members || [])]
        .filter((m) => joinedUserIds.has(m.userId))
        .sort((a, b) => {
          if (a.userId === session?.user?.id) return -1;
          if (b.userId === session?.user?.id) return 1;
          return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
        })
    : [];

  const getExpirationText = () => {
    if (isDeletionScheduled && conversationMeta?.deletionScheduledAt) {
      return new Date(conversationMeta.deletionScheduledAt)
        .toLocaleString(locale === "da" ? "da-DK" : "en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(",", "");
    }
    if (!conversationMeta?.expiresAt) return null;
    return new Date(conversationMeta.expiresAt)
      .toLocaleString(locale === "da" ? "da-DK" : "en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", "");
  };

  const isDeletionScheduled = !!conversationMeta?.deletionScheduledAt;
  const isInitiator = conversationMeta?.deletedByUserId === session?.user?.id;

  // Opens the appropriate modal depending on current mute state
  const handleMuteToggle = async (
    targetUserId: string,
    currentlyMuted: boolean,
    username?: string,
  ) => {
    if (currentlyMuted) {
      // Show revoke mute modal instead of immediately unmuting
      setRevokeMuteTarget({ userId: targetUserId, username: username || "" });
      return;
    }
    // Show new mute modal
    setMuteTarget({ userId: targetUserId, username: username || "" });
  };

  // Called by the BanMuteModal when confirmed
  const confirmMuteUser = async (
    action: "ban" | "mute",
    durationHours: number | null,
    reason: string | null,
  ) => {
    if (!muteTarget) return;
    const { userId } = muteTarget;
    const communityName = conversation?.community?.name;
    if (!chatId || !communityName) return;
    setMuteLoadingId(userId);
    try {
      await fetch(`/api/communities/${communityName}/members/${userId}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationHours, reason }),
      });
      onMutate();
      mutateConversations();
    } catch (e) {
      console.error("[ChatInfoSidebar] confirmMuteUser error:", e);
    } finally {
      setMuteLoadingId(null);
    }
  };

  // Called by the RevokeMuteModal when confirmed
  const confirmRevokeMute = async () => {
    if (!revokeMuteTarget) return;
    const { userId } = revokeMuteTarget;
    const communityName = conversation?.community?.name;
    if (!chatId || !communityName) return;
    setMuteLoadingId(userId);
    try {
      await fetch(`/api/communities/${communityName}/members/${userId}/mute`, {
        method: "DELETE",
      });
      onMutate();
      mutateConversations();
    } catch (e) {
      console.error("[ChatInfoSidebar] confirmRevokeMute error:", e);
    } finally {
      setMuteLoadingId(null);
      setRevokeMuteTarget(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!chatId) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch(
        `/api/conversations/${chatId}/participants/${userId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        onMutate();
        mutateConversations();
        globalMutate(
          (key) =>
            typeof key === "string" && key.includes("/api/conversations"),
        );
        if (userId === session?.user?.id) handleClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveNickname = async (userId: string, newNickname: string) => {
    if (!chatId) return;
    try {
      const res = await fetch(
        `/api/conversations/${chatId}/participants/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: newNickname.trim() || null }),
        },
      );
      if (res.ok) {
        onMutate();
        mutateConversations();
        globalMutate(
          (key) =>
            typeof key === "string" && key.includes("/api/conversations"),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      if (isDeletionScheduled) {
        // Only initiator can undo
        if (isInitiator) {
          await fetch(`/api/conversations/${chatId}/deletion`, {
            method: "DELETE",
          });
          setConfirmDelete(false);
          onMutate();
        }
      } else {
        if (!confirmDelete) {
          setConfirmDelete(true);
          setIsDeleting(false);
          return;
        }
        await fetch(`/api/conversations/${chatId}/deletion`, {
          method: "POST",
        });
        setConfirmDelete(false);
        onMutate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExtendChat = async (durationHours: 24 | 48 | 72) => {
    if (!chatId) throw new Error("No chat selected");
    const res = await fetch(`/api/conversations/${chatId}/extend`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationHours }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to extend chat");
    }
    onMutate();
    mutateConversations();
  };

  // Shared inner content (members, mute, auto-delete, footer actions)
  const innerContent = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Notification Mute Settings */}
      <div className="flex items-center justify-between border-b border-surface-border px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="relative flex items-center justify-center w-6 h-6">
            <Bell
              className={cn(
                "absolute transition-all duration-300 text-foreground-60",
                isMuted ? "opacity-0 scale-50" : "opacity-100 scale-100",
              )}
            />
            <BellOff
              className={cn(
                "absolute transition-all duration-300 text-brand",
                isMuted ? "opacity-100 scale-100" : "opacity-0 scale-50",
              )}
            />
          </span>
          <span className="text-sm font-medium text-foreground">
            {t("MessagesPage.muteMessages")}
          </span>
        </div>
        <Switch
          checked={isMuted}
          onCheckedChange={async (checked) => {
            setIsMuted(checked);
            if (chatId) {
              const { toggleChatMute } = await import("@/lib/hooks/use-chat");
              await toggleChatMute(chatId, checked);
              mutateConversations();
            }
          }}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-6 pt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-40">
            {t("MessagesPage.members")}
          </h3>
          {isGroup && !isCommunityChat && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-bold text-foreground hover:text-foreground/40 transition-colors cursor-pointer flex items-center gap-1"
            >
              {t("MessagesPage.edit_group")}
            </button>
          )}
        </div>

        {isCommunityChat ? (
          <ScrollArea className="flex-1 min-h-0 -mx-6 overflow-x-hidden">
            <div className="">
              {sortedCommunityMembers.length > 0 ? (
                sortedCommunityMembers.map(
                  (
                    member: NonNullable<
                      ApiConversation["community"]
                    >["members"][number],
                  ) => {
                    const isMe = member.userId === session?.user?.id;
                    const memberIsPrivileged = [
                      "OWNER",
                      "ADMIN",
                      "MODERATOR",
                    ].includes(member.role);

                    const canSeeRealIdentity =
                      isPrivilegedViewer || isMe || memberIsPrivileged;
                    const useAnonPreview = anonPreviewIds.has(member.userId);

                    const displayName =
                      canSeeRealIdentity && !useAnonPreview
                        ? member.user.name || member.user.username || "Unknown"
                        : (member.anonymousIdentity?.displayName ?? "Unknown");

                    const displayUsername =
                      canSeeRealIdentity && !useAnonPreview
                        ? (member.user.username ?? "")
                        : (member.anonymousIdentity?.username ?? "");

                    const avatarUser =
                      canSeeRealIdentity && !useAnonPreview
                        ? member.user
                        : {
                            ...member.user,
                            image: null,
                            avatarEmoji:
                              member.anonymousIdentity?.animalEmoji ?? null,
                            avatarBgColor:
                              member.anonymousIdentity?.bgColor ?? null,
                          };

                    // Look up the verified status from the conversation participants as fallback
                    // since the getConversations API includes emailVerified there
                    const pUser = conversation?.participants?.find(
                      (p) => p.user.id === member.userId,
                    )?.user;
                    const isVerified =
                      member.user.emailVerified || pUser?.emailVerified;

                    // Look up moderation mute status from community.mutes
                    const communityMute = conversation?.community?.mutes?.find(
                      (m) => m.userId === member.userId,
                    );

                    const memberIsMuted =
                      !!communityMute &&
                      (!communityMute.expiresAt ||
                        new Date(communityMute.expiresAt) > new Date());

                    // Global mute enriched by getConversations - cast to access the extra field
                    type MemberWithGlobalMute = typeof member & {
                      globalMute: {
                        reason: string | null;
                        expiresAt: string | null;
                      } | null;
                    };
                    const memberGlobalMute =
                      (member as MemberWithGlobalMute).globalMute ?? null;
                    const memberIsGloballyMuted =
                      !!memberGlobalMute &&
                      (!memberGlobalMute.expiresAt ||
                        new Date(memberGlobalMute.expiresAt) > new Date());

                    // Combined flag used for badge visibility
                    const memberIsAnyMuted =
                      memberIsMuted || memberIsGloballyMuted;
                    const canInteract = canKickOthers && !isMe;

                    // Only render the ghost toggle if the user HAS an anon identity and the viewer is allowed to switch it
                    const canToggleGhost =
                      isCommunityChat &&
                      (isPrivilegedViewer || isMe) &&
                      !!member.anonymousIdentity;

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-foreground/5 relative group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <ChatAvatar
                            participants={[{ user: avatarUser }]}
                            className="h-10 w-10 flex-shrink-0"
                          />

                          <div className="flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
                                {displayName}
                                {(!member.anonymousIdentity ||
                                  (canSeeRealIdentity && !useAnonPreview)) &&
                                  isVerified && (
                                    <VerifiedBadge className="h-3.5 w-3.5" />
                                  )}
                              </span>

                              {isMe && (
                                <span className="text-foreground-40 text-sm">
                                  ({t("MessagesPage.you")})
                                </span>
                              )}

                              {canToggleGhost && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    toggleAnonPreview(member.userId);
                                  }}
                                  title={t(
                                    isMe
                                      ? "MessagesPage.toggle_own_anon_identity"
                                      : "MessagesPage.toggle_other_anon_identity",
                                  )}
                                  className={cn(
                                    "flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-pointer flex-shrink-0",
                                    useAnonPreview
                                      ? "text-brand bg-brand/10"
                                      : "text-foreground-40 hover:text-foreground hover:bg-foreground/5",
                                  )}
                                >
                                  <Ghost className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {(canKickOthers || isMe) && memberIsAnyMuted && (
                                <button
                                  onClick={
                                    isMe
                                      ? (e) => {
                                          e.stopPropagation();
                                          setShowMyMuteModal(true);
                                        }
                                      : undefined
                                  }
                                  className={cn(
                                    "text-[10px] font-bold uppercase tracking-wide text-brand px-1.5 py-0.5 rounded-full bg-brand/10 flex-shrink-0",
                                    isMe &&
                                      "cursor-pointer hover:bg-brand/20 transition-colors",
                                  )}
                                >
                                  {t("MessagesPage.muted_badge")}
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                              <RoleBadge communityRole={member.role} />
                              <span className="text-xs text-foreground-60 truncate">
                                {canSeeRealIdentity && !useAnonPreview
                                  ? `u/${displayUsername}`
                                  : displayUsername}
                              </span>
                            </div>
                          </div>
                        </div>

                        {(canInteract || (isMe && !isOwner)) && (
                          <div
                            className="flex items-center z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {actionLoadingId === member.userId ||
                            muteLoadingId === member.userId ? (
                              <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-8 w-8 rounded-full hover:bg-foreground/10 text-foreground-40 hover:text-foreground transition-all cursor-pointer">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-[160px]"
                                >
                                  {canInteract && (
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() =>
                                        handleMuteToggle(
                                          member.userId,
                                          memberIsMuted,
                                          member.user.username || "",
                                        )
                                      }
                                    >
                                      <VolumeX className="h-4 w-4 mr-2 text-foreground-60" />
                                      <span className="text-foreground-60">
                                        {memberIsMuted
                                          ? t("MessagesPage.unmute_user")
                                          : t("MessagesPage.mute_user")}
                                      </span>
                                    </DropdownMenuItem>
                                  )}

                                  {(canInteract || (isMe && !isOwner)) && (
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() =>
                                        handleRemoveUser(member.userId)
                                      }
                                    >
                                      {isMe ? (
                                        <>
                                          <LogOut className="h-4 w-4 mr-2 text-brand" />
                                          <span className="text-brand font-semibold">
                                            {t("MessagesPage.leave_group")}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="h-4 w-4 mr-2 text-brand" />
                                          <span className="text-brand font-semibold">
                                            {t("MessagesPage.remove_user")}
                                          </span>
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                )
              ) : (
                <div className="flex items-center gap-3 px-6 py-2 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-surface-border" />
                  <div className="flex flex-col gap-1">
                    <div className="h-3 w-24 rounded bg-surface-border" />
                    <div className="h-2 w-16 rounded bg-surface-border" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : sortedParticipants.length > 0 ? (
          sortedParticipants.map((p) => {
            const isMe = p.user.id === session?.user?.id;
            const displayName = p.nickname || p.user.name || p.user.username;

            return (
              <Link
                key={p.user.id}
                href={`/${locale}/u/${p.user.username}`}
                className="flex items-center justify-between gap-3 -mx-6 px-6 py-2 transition-colors hover:bg-foreground/5 relative group"
                tabIndex={-1}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <ChatAvatar
                    participants={[p]}
                    className="h-10 w-10 flex-shrink-0"
                  />
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate group-hover:underline flex items-center gap-1">
                      {displayName}{" "}
                      {p.user.emailVerified && (
                        <VerifiedBadge className="h-3.5 w-3.5" />
                      )}
                      {isMe && (
                        <span className="text-foreground-40 ml-1 no-underline">
                          ({t("MessagesPage.you")})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-foreground-60 truncate">
                      u/{p.user.username}
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionLoadingId === p.user.id ? (
                    <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <DropdownMenu>
                      <Tooltip
                        content={t("MessagesPage.more_tooltip")}
                        side="bottom"
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 rounded-full hover:bg-surface border border-transparent hover:border-surface-border text-foreground-60 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="cursor-pointer py-2 rounded-none w-full group/del"
                          onClick={() => {
                            setNicknameTarget({
                              id: p.user.id,
                              current: p.nickname || "",
                              name: p.user.name || p.user.username || "",
                              username: p.user.username || "",
                            });
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2 transition-transform group-hover/del:scale-110" />
                          {t("MessagesPage.assign_nickname")}
                        </DropdownMenuItem>
                        {isGroup && (
                          <DropdownMenuItem
                            className="cursor-pointer py-2 px-3 text-brand focus:text-brand focus:bg-brand/10 hover:bg-brand/10 rounded-none w-full group/del"
                            onClick={() => handleRemoveUser(p.user.id)}
                          >
                            {isMe ? (
                              <>
                                <LogOut className="h-4 w-4 mr-2 transition-transform group-hover/del:scale-110 text-brand" />
                                <span className="text-brand font-semibold">
                                  {t("MessagesPage.leave_group")}
                                </span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2 transition-transform group-hover/del:scale-110 text-brand" />
                                <span className="text-brand font-semibold">
                                  {t("MessagesPage.remove_user")}
                                </span>
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="flex items-center gap-3 -mx-6 px-6 py-2 transition-colors hover:bg-foreground/5 cursor-pointer animate-pulse">
            <div className="h-10 w-10 rounded-full bg-surface-border" />
            <div className="flex flex-col gap-1">
              <div className="h-3 w-24 rounded bg-surface-border" />
              <div className="h-2 w-16 rounded bg-surface-border" />
            </div>
          </div>
        )}
      </div>

      {/* Current Games - direct chats only */}
      {isDirect && activeGames.length > 0 && (
        <div className="border-t border-surface-border">
          <div className="px-6 pt-4 pb-1 flex items-center gap-1.5">
            <Gamepad2 className="h-3.5 w-3.5 text-foreground-40" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-40">
              {t("minigames.sidebar_active_games")}
            </h3>
          </div>
          <div className="flex flex-col">
            {activeGames.map((game) => {
              const isMyTurn =
                game.currentTurnId === session?.user?.id &&
                game.status === "ACTIVE";
              const isPending = game.status === "PENDING";
              const opponent =
                game.player1Id === session?.user?.id
                  ? game.player2
                  : game.player1;

              const GAME_ICONS: Record<string, React.ElementType> = {
                TIC_TAC_TOE: Hash,
                CONNECT_FOUR: Circle,
                KNUCKLEBONES: Dices,
              };
              const GameIcon = GAME_ICONS[game.type] ?? Gamepad2;

              const GAME_LABEL_KEY: Record<string, string> = {
                TIC_TAC_TOE: "minigames.tic_tac_toe",
                CONNECT_FOUR: "minigames.connect_four",
                KNUCKLEBONES: "minigames.knucklebones",
              };

              const turnStatus = isPending
                ? t("minigames.sidebar_pending")
                : isMyTurn
                  ? t("minigames.sidebar_your_turn")
                  : t("minigames.sidebar_their_turn", {
                      username: opponent.username ?? "?",
                    });

              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    // LIVE games always open the board modal; ASYNC non-turn games open info
                    if (
                      isMyTurn ||
                      (game.mode === "LIVE" && game.status === "ACTIVE")
                    ) {
                      setSidebarGamePlayModal(game);
                    } else {
                      setSidebarGameInfoModal({ game });
                    }
                  }}
                  className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-semibold text-brand transition-colors hover:bg-foreground/5 cursor-pointer group border-b border-surface-border last:border-0"
                >
                  <GameIcon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <div className="flex flex-col flex-1 min-w-0 items-start">
                    <span className="font-semibold truncate">
                      {t(
                        GAME_LABEL_KEY[game.type] ??
                          "minigames.default_game_name",
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        isMyTurn ? "animate-pulse" : "text-brand/60",
                      )}
                    >
                      {turnStatus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-Delete Info - community chats never expire */}
      {!isCommunityChat && (
        <>
          <div className="px-6 py-5 border-y border-surface-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground-60">
                {t("MessagesPage.chat_expires_in")}
              </span>
              <span
                className={cn(
                  "text-sm font-bold",
                  isDeletionScheduled ? "text-brand" : "text-foreground",
                )}
              >
                {getExpirationText() || "..."}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Community chat: add separator above report button */}
      {isCommunityChat && (
        <div className="border-t border-surface-border w-full m-0 p-0" />
      )}

      {/* Footer actions */}
      <div className="flex flex-col border-surface-border flex-shrink-0">
        {/* Extend Chat Action - Only for non-community chats and if not scheduled for deletion */}
        {!isCommunityChat && !isDeletionScheduled && (
          <button
            onClick={() => setIsExtendModalOpen(true)}
            className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-semibold text-brand transition-colors hover:bg-foreground/5 cursor-pointer group border-b border-surface-border"
          >
            <Timer className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span>{t("MessagesPage.extend_chat")}</span>
          </button>
        )}

        {/* Delete - not available for community chats */}
        {!isCommunityChat && (
          <button
            onClick={handleToggleDelete}
            disabled={
              disabled || isDeleting || (isDeletionScheduled && !isInitiator)
            }
            className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-colors cursor-pointer group text-brand hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isDeletionScheduled && isInitiator ? (
              <>
                <Undo2 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                <span>{t("MessagesPage.undo_delete")}</span>
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                <span>
                  {confirmDelete
                    ? t("MessagesPage.confirm_delete")
                    : t("MessagesPage.deleteChat")}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {conversation && (
        <EditGroupChatModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          chatId={chatId!}
          currentName={conversation.name || ""}
          currentImage={conversation.image || null}
          currentAvatarEmoji={conversation.avatarEmoji || null}
          currentAvatarBgColor={conversation.avatarBgColor || null}
          participants={conversation.participants}
          onSuccess={() => {
            onMutate();
            mutateConversations();
          }}
        />
      )}

      {nicknameTarget && (
        <AssignNicknameModal
          key={nicknameTarget.id}
          isOpen={!!nicknameTarget}
          onClose={() => setNicknameTarget(null)}
          userId={nicknameTarget.id}
          currentNickname={nicknameTarget.current}
          targetName={nicknameTarget.name}
          targetUsername={nicknameTarget.username}
          onSave={handleSaveNickname}
        />
      )}

      {/* Below XL (<1280px): full overlay covering the entire chat area */}
      <div
        data-state={animState}
        className="xl:hidden chat-panel absolute inset-0 bg-background flex flex-col pb-12 md:pb-0"
        style={{ zIndex: 10000 }}
      >
        <div className="flex h-16 md:h-[88px] items-center justify-between border-b border-surface-border px-3 md:px-4 flex-shrink-0 bg-background">
          <h2 className="text-lg font-bold font-heading text-foreground pl-2">
            {t("MessagesPage.infoTitle")}
          </h2>
          <Tooltip
            content={t("MessagesPage.close_chat_info_tooltip")}
            side="bottom"
          >
            <button
              onClick={handleClose}
              className="flex items-center justify-center p-2 rounded-full text-foreground-60 hover:bg-foreground/5 md:p-0 md:h-14 md:w-14 md:rounded-xl md:border md:border-transparent md:text-foreground-60 md:hover:bg-foreground/5 transition-all duration-200 cursor-pointer outline-none group"
            >
              <X
                size={20}
                className="md:hidden transition-transform duration-200"
              />
              <X
                size={24}
                className="hidden md:block transition-transform duration-200 group-hover:scale-110"
              />
            </button>
          </Tooltip>
        </div>

        {innerContent}
      </div>

      {/* Above XL (>1280px): flex-sidebar that pushes the chat view */}
      <div
        className={cn(
          "hidden xl:flex h-full flex-shrink-0 flex-col border-l border-surface-border bg-background overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen ? "w-[300px] xl:w-[320px]" : "w-0 border-l-0",
        )}
      >
        <div className="w-[300px] xl:w-[320px] h-full flex flex-col">
          {/* Header */}
          <div className="flex h-16 md:h-[88px] items-center justify-between border-b border-surface-border px-4 flex-shrink-0">
            <h2 className="text-lg font-bold font-heading text-foreground pl-2">
              {t("MessagesPage.infoTitle")}
            </h2>
            <Tooltip
              content={t("MessagesPage.close_chat_info_tooltip")}
              side="bottom"
            >
              <button
                onClick={onClose}
                className="flex items-center justify-center h-14 w-14 rounded-xl text-foreground-60 border border-transparent hover:bg-foreground/5 transition-all duration-200 cursor-pointer outline-none group"
              >
                <X
                  size={24}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
              </button>
            </Tooltip>
          </div>
          {innerContent}
        </div>
      </div>

      {/* Active User's Mute Info Modal */}
      {(() => {
        const myMember = sortedCommunityMembers.find(
          (m) => m.userId === session?.user?.id,
        );
        type MemberWithGlobalMute = typeof myMember & {
          globalMute: {
            reason: string | null;
            expiresAt: string | null;
          } | null;
        };
        const myGlobalMute =
          (myMember as MemberWithGlobalMute | undefined)?.globalMute ?? null;
        const myGlobalMuteActive =
          !!myGlobalMute &&
          (!myGlobalMute.expiresAt ||
            new Date(myGlobalMute.expiresAt) > new Date());

        const myCommMute = conversation?.community?.mutes?.find(
          (m) => m.userId === session?.user?.id,
        );

        // Global mute takes display priority - it's platform-level and more informative
        const activeMute = myGlobalMuteActive
          ? myGlobalMute
          : (myCommMute ?? null);

        return (
          <MutedInfoModal
            isOpen={showMyMuteModal}
            onClose={() => setShowMyMuteModal(false)}
            reason={activeMute?.reason ?? null}
            mutedUntil={activeMute?.expiresAt ?? null}
          />
        );
      })()}

      {/* Revoke Mute Confirmation Modal */}
      {revokeMuteTarget && (
        <RevokeMuteModal
          isOpen={!!revokeMuteTarget}
          onClose={() => setRevokeMuteTarget(null)}
          onConfirm={confirmRevokeMute}
          targetUsername={revokeMuteTarget.username}
        />
      )}

      {/* Mute Modal */}
      <BanMuteModal
        isOpen={!!muteTarget}
        onClose={() => setMuteTarget(null)}
        onConfirm={confirmMuteUser}
        actionType="mute"
        targetUsername={muteTarget?.username || ""}
        onSuccessComplete={() => setMuteTarget(null)}
      />

      {/* Extend Chat Modal */}
      <ExtendChatModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        onConfirm={handleExtendChat}
        currentExpiration={conversationMeta?.expiresAt ?? null}
      />

      {/* Sidebar game modals */}

      {sidebarGameInfoModal && (
        <GameInfoModal
          isOpen={!!sidebarGameInfoModal}
          onClose={() => setSidebarGameInfoModal(null)}
          gameType={sidebarGameInfoModal.game.type as GameType}
          currentUserId={session?.user?.id ?? ""}
          game={sidebarGameInfoModal.game}
          opponentId={
            sidebarGameInfoModal.game.player1Id === session?.user?.id
              ? sidebarGameInfoModal.game.player2Id
              : sidebarGameInfoModal.game.player1Id
          }
          opponentUsername={
            (sidebarGameInfoModal.game.player1Id === session?.user?.id
              ? sidebarGameInfoModal.game.player2
              : sidebarGameInfoModal.game.player1
            ).username ?? ""
          }
          conversationId={chatId ?? ""}
          onOpenPlay={(game) => {
            setSidebarGameInfoModal(null);
            setSidebarGamePlayModal(game);
          }}
          onOpenHistory={() => {
            const opponent =
              sidebarGameInfoModal.game.player1Id === session?.user?.id
                ? sidebarGameInfoModal.game.player2
                : sidebarGameInfoModal.game.player1;
            setSidebarGameInfoModal(null);
            setSidebarGameHistoryModal({
              opponentId: opponent.id,
              opponentUsername: opponent.username ?? "",
            });
          }}
          onAccepted={() => setSidebarGameInfoModal(null)}
          onDeclined={() => setSidebarGameInfoModal(null)}
          onCancelled={() => setSidebarGameInfoModal(null)}
        />
      )}

      {sidebarGamePlayModal && (
        <GamePlayModal
          isOpen={!!sidebarGamePlayModal}
          onClose={() => setSidebarGamePlayModal(null)}
          initialGame={sidebarGamePlayModal}
        />
      )}

      {sidebarGameHistoryModal && (
        <GameHistoryModal
          isOpen={!!sidebarGameHistoryModal}
          onClose={() => setSidebarGameHistoryModal(null)}
          opponentId={sidebarGameHistoryModal.opponentId}
          opponentUsername={sidebarGameHistoryModal.opponentUsername}
          currentUserId={session?.user?.id ?? ""}
        />
      )}
    </>
  );
}
