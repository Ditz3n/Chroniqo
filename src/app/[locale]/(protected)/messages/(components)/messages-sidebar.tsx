// src/app/[locale]/(protected)/messages/(components)/messages-sidebar.tsx
"use client";

import { ChatAvatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { markChatAsRead, useConversations } from "@/lib/hooks/use-chat";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getChatDisplayName } from "@/lib/utils/chat-helpers";
import {
  resolveChatSystemMessage,
  resolveGameMessagePreview,
} from "@/lib/utils/i18n-payload";
import { timeAgo } from "@/lib/utils/time";
import {
  ApiConversation,
  MessagesSidebarProps,
  MiniChatLastMessage,
  SearchUser,
} from "@/types/app-types";
import { BellOff, ChevronLeft, Edit, Gamepad2, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { NewChatContent, NewChatModal } from "./new-chat-modal";
import { NotesCarousel } from "./notes-carousel";

// Duration matches --animate-chat-fade-out and --animate-chat-enter in globals.css
const ANIM_MS = 220;

export function MessagesSidebar({
  onSelectChat,
  selectedChatId,
}: MessagesSidebarProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "new">("list");
  const [exitingView, setExitingView] = useState<"list" | "new" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = useIsMobile();

  // Auto-close desktop dialog when resizing into mobile
  useEffect(() => {
    if (isMobile && showNewChat) {
      const timer = setTimeout(() => setShowNewChat(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isMobile, showNewChat]);

  const { t } = useTranslation();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<
    "direct" | "groups" | "requests" | "communities"
  >("direct");

  const { data: convData, isLoading } = useConversations();
  const conversations: ApiConversation[] = convData?.conversations || [];
  const communityConversations: ApiConversation[] =
    convData?.communityConversations || [];

  const handleSearchFocus = () => setIsSearching(true);
  const handleSearchCancel = () => {
    setSearchValue("");
    setIsSearching(false);
  };

  const handleUserSelected = async (
    users: SearchUser[],
    durationHours: 24 | 48 | 72,
  ) => {
    if (users.length === 1) {
      const user = users[0];
      const existing = conversations.find(
        (c) =>
          c.participants.length === 2 &&
          c.participants.some((p) => p.user.id === user.id),
      );
      if (existing) {
        onSelectChat(existing.id);
        setActiveTab("direct");
        if (isMobile) closeNewChat();
        else setShowNewChat(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: users.map((u) => u.id),
          durationHours,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSelectChat(data.conversation.id);
        setActiveTab(users.length > 1 ? "groups" : "direct");
        if (isMobile) closeNewChat();
        else setShowNewChat(false);
      }
    } catch (err) {
      console.error("Failed to create chat", err);
    }
  };

  const getOtherUser = (chat: ApiConversation) =>
    chat.participants.find((p) => p.user.id !== session?.user?.id)?.user ||
    chat.participants[0]?.user;

  // Search across personal chats AND community chats
  const filteredPersonal = conversations.filter((chat) => {
    if (!searchValue.trim()) return true;
    const other = getOtherUser(chat);
    const q = searchValue.toLowerCase();
    return (
      other?.username?.toLowerCase().includes(q) ||
      other?.name?.toLowerCase().includes(q)
    );
  });
  const filteredCommunity = communityConversations.filter((chat) => {
    if (!searchValue.trim()) return true;
    return chat.name?.toLowerCase().includes(searchValue.toLowerCase());
  });
  const filteredConversations = [...filteredPersonal, ...filteredCommunity];

  // A conversation is a "request" if the current user's participant status is PENDING
  const isRequest = (chat: ApiConversation) =>
    chat.participants.find((p) => p.user.id === session?.user?.id)?.status ===
    "PENDING";

  const directChats = conversations.filter(
    (c) => c.participants.length === 2 && !isRequest(c),
  );
  const groupChats = conversations.filter(
    (c) => c.participants.length > 2 && !isRequest(c),
  );
  const requestChats = conversations.filter((c) => isRequest(c));

  // Community chats grouped by whether the user has joined the chat
  const joinedCommunityChats = communityConversations.filter((c) =>
    c.participants.some((p) => p.user.id === session?.user?.id),
  );
  const availableCommunityChats = communityConversations.filter(
    (c) => !c.participants.some((p) => p.user.id === session?.user?.id),
  );

  // Communities tab renders its own grouped content - return empty here
  const activeList =
    activeTab === "direct"
      ? directChats
      : activeTab === "groups"
        ? groupChats
        : activeTab === "requests"
          ? requestChats
          : [];

  // Calculate the number of chats with unread messages for the tab badges
  const getUnreadChatsCount = (chats: ApiConversation[]) => {
    return chats.filter((chat) => {
      const me = chat.participants.find((p) => p.user.id === session?.user?.id);
      if (me?.isMuted) return false;
      return ((chat as ApiConversation).unreadCount || 0) > 0;
    }).length;
  };

  const directUnreadChats = getUnreadChatsCount(directChats);
  const groupUnreadChats = getUnreadChatsCount(groupChats);
  const communityUnreadChats = getUnreadChatsCount(joinedCommunityChats);

  // -- Fade transition helpers -----------------------------------------------
  const goTo = (view: "list" | "new") => {
    if (isTransitioning) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setExitingView(activeView);
    setIsTransitioning(true);
    setActiveView(view);
    timerRef.current = setTimeout(() => {
      setExitingView(null);
      setIsTransitioning(false);
    }, ANIM_MS);
  };

  // Mobile: fade transition to new-chat panel
  const openNewChat = () => goTo("new");
  const closeNewChat = () => goTo("list");
  // Desktop: open dialog
  const openDesktopDialog = () => setShowNewChat(true);

  // Panel state helpers - mirrors floating-chat.tsx logic
  const listState =
    activeView === "list" && !exitingView
      ? "active"
      : activeView === "list" && !!exitingView
        ? "entering"
        : exitingView === "list"
          ? "exiting"
          : "hidden";

  const newState =
    activeView === "new" && !exitingView
      ? "active"
      : activeView === "new" && !!exitingView
        ? "entering"
        : exitingView === "new"
          ? "exiting"
          : "hidden";

  // -- Shared chat row - used for both personal and community chats -----------
  const renderChatRow = (chat: ApiConversation, forceMutedOpacity = false) => {
    const myParticipant = chat.participants.find(
      (p) => p.user.id === session?.user?.id,
    );
    const isMuted = myParticipant?.isMuted;
    const unreadCount = (chat as ApiConversation).unreadCount || 0;
    const hasUnread = unreadCount > 0;

    const otherParticipants = chat.participants.filter(
      (p) => p.user.id !== session?.user?.id,
    );
    const chatName = getChatDisplayName(
      chat,
      session?.user?.id,
      t("MessagesPage.unknown_user"),
    );
    const lastMessage: MiniChatLastMessage | undefined = chat.messages?.[0];
    const isSystemBrand =
      lastMessage?.messageType === "DELETION_SCHEDULED" ||
      lastMessage?.messageType === "DELETION_CANCELED";

    let previewText = lastMessage?.content;
    if (lastMessage?.isSystem && lastMessage.messageType?.startsWith("GAME_")) {
      previewText = resolveGameMessagePreview(
        lastMessage.content,
        lastMessage.messageType,
        t,
      );
    } else if (lastMessage?.isSystem) {
      previewText = resolveChatSystemMessage(
        lastMessage.content,
        lastMessage.messageType,
        lastMessage.sender?.name || lastMessage.sender?.username || "Unknown",
        t,
      );
    } else if (lastMessage?.deletedAt) {
      previewText = t("MessagesPage.message_deleted");
    } else if (lastMessage?.content && lastMessage?.sender) {
      const senderHandle =
        lastMessage.sender.username || lastMessage.sender.name;
      previewText = `u/${senderHandle}: ${lastMessage.content}`;
    }

    return (
      <div
        key={chat.id}
        onClick={() => {
          markChatAsRead(chat.id);
          onSelectChat(chat.id);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 py-3 px-6 transition-colors border-b border-surface-border/50 last:border-0",
          selectedChatId === chat.id
            ? "bg-foreground/5 hover:bg-foreground/10"
            : "hover:bg-foreground/5",
          forceMutedOpacity && "opacity-60",
        )}
      >
        <div className="relative flex-shrink-0">
          <ChatAvatar
            participants={
              chat.isCommunity
                ? []
                : chat.participants.length > 2
                  ? chat.participants
                  : otherParticipants
            }
            chatImage={chat.image}
            ringParticipants={chat.isCommunity ? [] : chat.participants}
            emojiSizeClass="text-2xl"
            className="h-12 w-12"
            avatarEmoji={chat.avatarEmoji}
            avatarBgColor={chat.avatarBgColor}
            name={chat.isCommunity ? chatName : undefined}
          />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div
            className={cn(
              "flex items-center justify-between min-w-0",
              lastMessage ? "mb-0.5" : "mb-4.5",
            )}
          >
            <span
              className={cn(
                "text-sm truncate flex items-center gap-1",
                hasUnread
                  ? "font-bold text-foreground"
                  : "font-semibold text-foreground-80",
              )}
            >
              {chatName}
              {!chat.isCommunity &&
                otherParticipants.length === 1 &&
                otherParticipants[0].user.emailVerified && (
                  <VerifiedBadge className="h-3.5 w-3.5" />
                )}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {isMuted ? (
                <BellOff className="h-3 w-3 text-foreground-40" />
              ) : (
                hasUnread && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )
              )}
              <span
                className={cn(
                  "text-xs",
                  hasUnread && !isMuted
                    ? "text-brand font-bold"
                    : "text-foreground-40",
                )}
              >
                {timeAgo(chat.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs min-w-0 mt-0.5">
            {lastMessage?.messageType?.startsWith("GAME_") && (
              <Gamepad2 className="h-3 w-3 text-foreground-40 flex-shrink-0" />
            )}
            <span
              className={cn(
                "text-xs truncate min-w-0",
                isSystemBrand
                  ? "text-brand font-semibold"
                  : hasUnread
                    ? "text-foreground font-medium"
                    : "text-foreground-60",
              )}
            >
              {previewText || t("MessagesPage.new_conversation")}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // -- Tab definitions -------------------------------------------------------
  const tabs = [
    {
      key: "direct" as const,
      label: t("MessagesPage.direct"),
      badge: directUnreadChats,
    },
    {
      key: "groups" as const,
      label: t("MessagesPage.groups"),
      badge: groupUnreadChats,
    },
    {
      key: "communities" as const,
      label: t("MessagesPage.communities"),
      badge: communityUnreadChats,
    },
    {
      key: "requests" as const,
      label: t("chat_requests.tab_requests"),
      badge: requestChats.length,
    },
  ];

  // -- Shared list content ---------------------------------------------------
  const listContent = (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center px-1 min-w-0 flex-1 mr-2">
          <h1 className="text-xl font-bold font-heading text-foreground truncate">
            {session?.user?.username || session?.user?.name}
          </h1>
        </div>
        <Tooltip content={t("MessagesPage.new_chat_tooltip")} side="bottom">
          <button
            onClick={() => (isMobile ? openNewChat() : openDesktopDialog())}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-foreground/5 text-foreground transition-colors cursor-pointer"
          >
            <Edit size={22} />
          </button>
        </Tooltip>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-2 flex-shrink-0">
        <div className="relative flex items-center">
          {isSearching && (
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-8 transition-all duration-200 hover:scale-110 cursor-pointer"
              onClick={handleSearchCancel}
            >
              <ChevronLeft className="h-6 w-6 text-foreground-60 hover:text-foreground" />
            </button>
          )}
          <div className="relative flex-1 transition-all duration-200">
            <Search
              className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-40 pointer-events-none transition-all duration-200",
                isSearching ? "left-12" : "left-4",
              )}
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={handleSearchFocus}
              placeholder={t("MessagesPage.searchPlaceholder")}
              className={cn(
                "rounded-full bg-surface border border-surface-border py-2 text-sm outline-none transition-all duration-200 placeholder:text-foreground-40 hover:border-foreground/20 focus:border-brand focus:ring-1 focus:ring-brand text-foreground",
                isSearching
                  ? "w-[calc(100%-2rem)] ml-8 pl-10 pr-4"
                  : "w-full pl-10 pr-4",
              )}
            />
          </div>
        </div>
      </div>

      {isSearching ? (
        <ScrollArea className="flex-1 mt-2">
          <div className="flex flex-col pb-12 md:pb-0">
            {filteredConversations.map((chat) => {
              const otherParticipants = chat.participants.filter(
                (p) => p.user.id !== session?.user?.id,
              );
              const chatName = getChatDisplayName(
                chat,
                session?.user?.id,
                t("MessagesPage.unknown_user"),
              );

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    setIsSearching(false);
                    setSearchValue("");
                  }}
                  className="flex cursor-pointer items-center gap-3 py-3 px-6 transition-colors hover:bg-foreground/5 border-b border-surface-border/50 last:border-0"
                >
                  <ChatAvatar
                    participants={
                      chat.isCommunity
                        ? []
                        : chat.participants.length > 2
                          ? chat.participants
                          : otherParticipants
                    }
                    chatImage={chat.image}
                    ringParticipants={chat.isCommunity ? [] : chat.participants}
                    className="h-12 w-12 flex-shrink-0"
                    avatarEmoji={chat.avatarEmoji}
                    avatarBgColor={chat.avatarBgColor}
                    name={chat.isCommunity ? chatName : undefined}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
                      {chatName}
                      {!chat.isCommunity &&
                        otherParticipants.length === 1 &&
                        otherParticipants[0].user.emailVerified && (
                          <VerifiedBadge className="h-3.5 w-3.5" />
                        )}
                    </span>
                    {chat.isCommunity ? (
                      <span className="text-xs text-foreground-60 truncate">
                        {t("MessagesPage.community_chat_badge")}
                      </span>
                    ) : (
                      otherParticipants.length === 1 && (
                        <span className="text-xs text-foreground-60 truncate">
                          u/{otherParticipants[0].user.username}
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
            {filteredConversations.length === 0 && (
              <div className="flex items-center justify-center py-16 text-sm text-foreground-40">
                {t("MessagesPage.no_results")}
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <>
          <NotesCarousel onSelectChat={onSelectChat} />

          {/* Tab bar - scrollable on narrow panels */}
          <ScrollArea
            type="auto"
            className="w-full min-h-[40px]"
            viewportClassName="overflow-x-auto overflow-y-hidden"
            horizontalScrollbarTop={true}
            thumbSizeClass="min-w-[32px]"
            onWheel={(e) => {
              const viewport = e.currentTarget.querySelector(
                "[data-radix-scroll-area-viewport]",
              );
              if (viewport && e.deltaY !== 0) {
                const direction = e.deltaY > 0 ? 1 : -1;
                const SCROLL_STEP = 20;
                viewport.scrollLeft += direction * SCROLL_STEP;
                e.preventDefault();
              }
            }}
          >
            <div className="flex items-center justify-start gap-6 px-6 pb-1 border-b border-surface-border flex-shrink-0 min-w-max min-h-[40px] bg-background">
              {tabs.map(({ key, label, badge }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "text-sm font-bold py-1 transition-colors cursor-pointer border-b-2 relative top-[5px] whitespace-nowrap flex-shrink-0",
                    activeTab === key
                      ? "text-foreground border-brand"
                      : "text-foreground-60 border-transparent hover:text-foreground",
                  )}
                >
                  {label}
                  {badge > 0 && (
                    <span className="ml-1.5 bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>

          <ScrollArea className="flex-1">
            <div className="flex flex-col pb-12 md:pb-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
              ) : activeTab === "communities" ? (
                // -- Communities tab: two grouped sections -------------------
                <>
                  {joinedCommunityChats.length === 0 &&
                  availableCommunityChats.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-foreground-40">
                      {t("MessagesPage.no_results")}
                    </div>
                  ) : (
                    <>
                      {joinedCommunityChats.length > 0 && (
                        <>
                          <div className="px-6 pt-4 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground-40">
                              {t("MessagesPage.joined_community_chats")}
                            </span>
                          </div>
                          {joinedCommunityChats.map((chat) =>
                            renderChatRow(chat),
                          )}
                        </>
                      )}

                      {availableCommunityChats.length > 0 && (
                        <>
                          <div className="px-6 pt-4 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground-40">
                              {t("MessagesPage.available_community_chats")}
                            </span>
                          </div>
                          {availableCommunityChats.map((chat) =>
                            renderChatRow(chat, true),
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : activeList.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-foreground-40">
                  {t("MessagesPage.no_results")}
                </div>
              ) : (
                activeList.map((chat) => renderChatRow(chat))
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );

  return (
    <div className="relative h-full w-full bg-background overflow-hidden">
      {/* Avatar Only Panel (md only) */}
      <div className="absolute inset-0 hidden md:flex lg:hidden flex-col">
        <div className="flex items-center justify-center h-[72px] md:h-[88px] border-b border-surface-border flex-shrink-0">
          <button
            onClick={openDesktopDialog}
            className="flex items-center justify-center h-14 w-14 rounded-xl text-foreground-60 hover:bg-foreground/5 hover:text-foreground transition-all duration-200 cursor-pointer group"
          >
            <Edit className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              </div>
            ) : (
              // Personal chats + joined community chats, sorted by activity
              [...conversations, ...joinedCommunityChats]
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime(),
                )
                .map((chat) => {
                  const otherParticipants = chat.participants.filter(
                    (p) => p.user.id !== session?.user?.id,
                  );
                  return (
                    <button
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className={cn(
                        "relative flex items-center justify-center w-full py-3 transition-colors",
                        selectedChatId === chat.id
                          ? "bg-foreground/5 hover:bg-foreground/10"
                          : "hover:bg-foreground/5",
                      )}
                    >
                      <div className="relative">
                        <ChatAvatar
                          participants={
                            chat.isCommunity ? [] : otherParticipants
                          }
                          chatImage={chat.image}
                          ringParticipants={
                            chat.isCommunity ? [] : chat.participants
                          }
                          emojiSizeClass="text-2xl"
                          className="h-11 w-11"
                          avatarEmoji={chat.avatarEmoji}
                          avatarBgColor={chat.avatarBgColor}
                          name={chat.isCommunity ? chat.name : undefined}
                        />
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile Layout (< md) */}
      <div className="absolute inset-0 flex md:hidden">
        {/* List Panel */}
        <div
          data-state={listState}
          className="chat-panel absolute inset-0 overflow-y-auto overflow-x-hidden bg-background"
        >
          {listContent}
        </div>

        {/* New Message Panel */}
        {(activeView === "new" || exitingView === "new") && (
          <div
            data-state={newState}
            className="chat-panel absolute inset-0 overflow-y-auto overflow-x-hidden bg-background"
          >
            <div className="flex flex-col h-full">
              <div className="bg-background flex-shrink-0">
                <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border">
                  <Tooltip
                    content={t("MessagesPage.back_tooltip")}
                    side="bottom"
                  >
                    <button
                      onClick={closeNewChat}
                      className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-foreground/5 text-foreground-60 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  </Tooltip>
                  <h2 className="text-base font-bold text-foreground">
                    {t("MessagesPage.newMessage")}
                  </h2>
                  <div className="w-9" />
                </div>
              </div>
              <NewChatContent
                isOpen={activeView === "new"}
                onClose={closeNewChat}
                onStartChat={handleUserSelected}
                hideHeader
                searchRowClassName="bg-background"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Layout (>lg) */}
      <div className="absolute inset-0 hidden lg:flex flex-col">
        {listContent}
      </div>

      {/* Desktop Dialog */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onStartChat={handleUserSelected}
      />
    </div>
  );
}
