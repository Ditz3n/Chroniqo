// src/components/chat/floating-chat.tsx
"use client";

import { ChatAvatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useDailyStatus } from "@/context/daily-status-context";
import { markChatAsRead, useConversations } from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getChatDisplayName } from "@/lib/utils/chat-helpers";
import { ApiConversation, ChatView } from "@/types/app-types";
import { ChevronLeft, Maximize2, MessagesSquare, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MiniChatList } from "./mini-chat-list";
import { MiniChatView } from "./mini-chat-view";
import { MiniNewMessage } from "./mini-new-message";

/**
 * Duration of content + header morph animations (ms).
 * Matches --animate-chat-fade-out and --animate-chat-enter in globals.css.
 */
const ANIM_MS = 220;

export function FloatingChat() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { currentValue } = useDailyStatus();

  const [isOpen, setIsOpen] = useState(false);

  const [activeView, setActiveView] = useState<ChatView>("list");
  const [exitingView, setExitingView] = useState<ChatView | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [exitingChatId, setExitingChatId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: convData } = useConversations();
  const conversations = convData?.conversations || [];

  // Include community chats where the user has explicitly joined
  const joinedCommunityChats = (convData?.communityConversations || []).filter(
    (c: ApiConversation) =>
      c.participants.some((p) => p.user.id === session?.user?.id),
  );

  // Merged list sorted by most recent activity for the pill and chat list
  const allConversations: ApiConversation[] = [
    ...conversations,
    ...joinedCommunityChats,
  ].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  // -- Conversation details for header ------------------------------------------------
  const getConvoDetails = (chatId: string | null) => {
    if (!chatId) return null;
    const convo = allConversations.find(
      (c: ApiConversation) => c.id === chatId,
    );
    if (!convo) return null;

    const otherParticipants = convo.participants.filter(
      (p: ApiConversation["participants"][number]) =>
        p.user.id !== session?.user?.id,
    );

    const chatName = getChatDisplayName(convo, session?.user?.id);

    // Ensure avatarEmoji and avatarBgColor are included for ChatAvatar
    return {
      id: convo.id,
      name: chatName,
      participants: convo.participants, // all participants for group split
      otherParticipants, // keep for 1:1
      lastActive: t("MessagesPage.active"),
      avatarEmoji: convo.avatarEmoji ?? null,
      avatarBgColor: convo.avatarBgColor ?? null,
      isCommunity: convo.isCommunity ?? false,
    };
  };

  const selectedConversation = getConvoDetails(selectedChatId);
  const exitingConversation = getConvoDetails(exitingChatId);
  const headerChatConvo = selectedConversation ?? exitingConversation;

  // Hidden on mobile - use the dedicated /messages page instead.
  if (pathname.endsWith("/messages")) return null;

  const totalUnread = allConversations.reduce((acc, c) => {
    const me = c.participants.find(
      (p: ApiConversation["participants"][number]) =>
        p.user.id === session?.user?.id,
    );
    if (me?.isMuted) return acc;
    return acc + (c.unreadCount || 0);
  }, 0);

  const isLowEnergy = currentValue !== null && currentValue <= 1;

  // Take up to 3 most recent conversations where user is ACCEPTED
  const recentConversations = allConversations
    .filter((c: ApiConversation) =>
      c.participants.some(
        (p) => p.user.id === session?.user?.id && p.status === "ACCEPTED",
      ),
    )
    .slice(0, 3);

  // -- Navigate --------------------------------------------------------------
  const goTo = (
    view: ChatView,
    dir: "forward" | "back",
    incomingChatId?: string,
  ) => {
    if (isTransitioning) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setExitingView(activeView);
    setExitingChatId(activeView === "chat" ? selectedChatId : null);
    setIsTransitioning(true);
    setActiveView(view);
    if (incomingChatId !== undefined) setSelectedChatId(incomingChatId);

    timerRef.current = setTimeout(() => {
      setExitingView(null);
      setExitingChatId(null);
      setIsTransitioning(false);
      if (dir === "back") setSelectedChatId(null);
    }, ANIM_MS);
  };

  const handleSelectChat = (id: string) => {
    markChatAsRead(id);
    goTo("chat", "forward", id);
  };
  const handleBack = () => {
    if (activeView === "chat" || activeView === "new") goTo("list", "back");
  };
  const handleMaximize = () => {
    if (selectedChatId) {
      router.push(`/${locale}/messages?chat=${selectedChatId}`);
    } else {
      router.push(`/${locale}/messages`);
    }
  };

  // -- Panel state helpers ---------------------------------------------------
  /**
   * Each panel is a PERSISTENT DOM node. Transitions are driven
   * by `data-state` attribute changes on the *same* node, which restart CSS
   * animations without any React remount. This means:
   *
   *   • List panel - always mounted; never remounts.
   *   • Chat panel - mounted once per chatId (key={chatPanelId}); the same
   *     instance that was showing the chat bottom goes directly from
   *     data-state="active" to data-state="exiting" - its scroll position is
   *     preserved and the browser fades it out from the correct position.
   *   • New panel - conditionally mounted (only when needed); no scroll issue.
   *
   * data-state values and their CSS:
   *   "active" -> z-0, opacity 1, pointer-events auto (stable, no animation)
   *   "entering" -> z-0, animate: chat-enter (opacity 0→1 after 60 ms delay)
   *   "exiting" -> z-10, animate: chat-fade-out (opacity 1→0), pointer-events none
   *   "hidden" -> z-[-1], opacity 0, pointer-events none, invisible off-screen
   */
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

  // The chat panel's key - stable for the duration of the same chat session so
  // React keeps the same DOM node (and its scroll position) through transitions.
  const chatPanelId = selectedChatId ?? exitingChatId;

  const chatState = !chatPanelId
    ? "hidden"
    : activeView === "chat" && !exitingView
      ? "active"
      : activeView === "chat" && !!exitingView
        ? "entering"
        : exitingView === "chat"
          ? "exiting"
          : "hidden";

  return (
    <div className="fixed bottom-8 right-8 z-[90] hidden md:block ">
      {/* Single morphing container */}
      <div
        data-open={isOpen}
        className={cn(
          "relative overflow-hidden bg-surface-opaque border border-surface-border ",
          "chat-morph ",
          isOpen
            ? "w-[360px] h-[540px] rounded-2xl shadow-2xl cursor-default"
            : "w-14 h-14 rounded-full shadow-xl md:w-[248px] hover:bg-surface-hover ",
        )}
      >
        {/* Pill Layer */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label={t("FloatingChat.messages")}
          className={cn(
            "absolute inset-0 flex items-center w-full h-full transition-opacity cursor-pointer",
            isOpen
              ? "opacity-0 pointer-events-none duration-75 delay-0"
              : "opacity-100 duration-200 delay-300",
          )}
        >
          <div className="hidden md:flex items-center justify-between w-full h-full pl-5 pr-4">
            <div className="flex items-center gap-3 relative">
              <div className="relative">
                <MessagesSquare className="h-6 w-6 text-brand flex-shrink-0" />
                {totalUnread > 0 && !isLowEnergy && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white border-2 border-surface-opaque">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              <span className="font-bold font-heading text-sm text-foreground whitespace-nowrap">
                {t("FloatingChat.messages")}
              </span>
            </div>
            {recentConversations.length > 0 && (
              <div className="flex items-center">
                {recentConversations.map(
                  (convo: ApiConversation, index: number) => {
                    const others = convo.participants.filter(
                      (p) => p.user.id !== session?.user?.id,
                    );
                    return (
                      <div
                        key={convo.id}
                        className={cn(
                          "flex-shrink-0 rounded-full bg-surface-opaque -ml-2.5 first:ml-0 p-[1.5px]",
                          index === 0 ? "z-30" : index === 1 ? "z-20" : "z-10",
                        )}
                        style={
                          {
                            "--tw-ring-offset-color": "var(--surface-opaque)",
                          } as React.CSSProperties
                        }
                      >
                        <ChatAvatar
                          participants={
                            convo.participants.length > 2
                              ? convo.participants
                              : others
                          }
                          chatImage={convo.image}
                          className="h-7 w-7"
                          ringParticipants={convo.participants}
                          avatarEmoji={convo.avatarEmoji}
                          avatarBgColor={convo.avatarBgColor}
                        />
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </button>

        {/* Window Layer */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col transition-opacity",
            isOpen
              ? "opacity-100 duration-[250ms] delay-200 pointer-events-auto"
              : "opacity-0 duration-150 pointer-events-none",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border bg-surface flex-shrink-0">
            <div className="flex items-center flex-1 min-w-0 overflow-hidden">
              {/* Back button */}
              <div
                className={cn(
                  "flex-shrink-0 overflow-hidden",
                  "transition-[width,opacity,margin] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  activeView !== "list"
                    ? "w-8 opacity-100 mr-1"
                    : "w-0 opacity-0 mr-0",
                )}
              >
                <Tooltip content={t("FloatingChat.back")} side="bottom">
                  <button
                    onClick={handleBack}
                    aria-label={t("FloatingChat.back")}
                    className="hover:bg-foreground/10 p-1 rounded-full transition-colors cursor-pointer text-foreground-60 hover:text-foreground mt-px"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                </Tooltip>
              </div>

              {/* Morphing title  */}
              <div className="relative flex-1 min-w-0 h-10 overflow-hidden">
                {/* "Messages" */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center",
                    "transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    activeView === "list"
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-8 opacity-0",
                  )}
                >
                  <h3 className="font-bold font-heading text-lg text-foreground">
                    {t("FloatingChat.messages")}
                  </h3>
                </div>

                {/* "New Message" */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center",
                    "transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    activeView === "new"
                      ? "translate-x-0 opacity-100"
                      : "translate-x-8 opacity-0",
                  )}
                >
                  <h3 className="font-bold font-heading text-lg text-foreground">
                    {t("FloatingChat.newMessage")}
                  </h3>
                </div>

                {/* Chat: avatar + name + last-active */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center",
                    "transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    activeView === "chat"
                      ? "translate-x-0 opacity-100"
                      : "translate-x-8 opacity-0",
                  )}
                >
                  {headerChatConvo && (
                    <div className="flex items-center gap-2.5 ml-1.5">
                      <ChatAvatar
                        participants={
                          headerChatConvo.isCommunity
                            ? []
                            : headerChatConvo.participants.length > 2
                              ? headerChatConvo.participants
                              : headerChatConvo.otherParticipants
                        }
                        className="h-8 w-8 flex-shrink-0"
                        emojiSizeClass="text-base"
                        ringParticipants={headerChatConvo.participants}
                        avatarEmoji={headerChatConvo.avatarEmoji}
                        avatarBgColor={headerChatConvo.avatarBgColor}
                        name={
                          headerChatConvo.isCommunity
                            ? headerChatConvo.name
                            : undefined
                        }
                      />
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold font-heading text-sm text-foreground truncate max-w-[140px]">
                          {headerChatConvo.name}
                        </span>
                        <span className="text-xs text-foreground-40 font-medium">
                          {headerChatConvo.lastActive}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
              <Tooltip content={t("FloatingChat.messages")} side="bottom">
                <button
                  onClick={handleMaximize}
                  aria-label={t("FloatingChat.messages")}
                  className="hover:bg-foreground/10 p-2 rounded-full transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content={t("FloatingChat.close")} side="bottom">
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label={t("FloatingChat.close")}
                  className="hover:bg-foreground/10 p-2 rounded-full transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Content panels */}
          <div className="flex-1 overflow-hidden bg-background relative">
            {/*
             * List Panel - always mounted, NEVER remounts.
             *
             * data-state drives all visual transitions via CSS in globals.css:
             *   "active" -> fully visible, z-0
             *   "entering" -> fade in after 60 ms delay (chat-enter animation)
             *   "exiting" -> fade out (chat-fade-out animation), z-10 on top
             *   "hidden" -> invisible, z-[-1], off-screen
             *
             * Because the node persists, no remount = no scroll-jump artefacts.
             */}
            <div
              data-state={listState}
              className="chat-panel absolute inset-0 overflow-y-auto overflow-x-hidden"
            >
              <MiniChatList
                onSelectChat={handleSelectChat}
                onNewMessage={() => goTo("new", "forward")}
              />
            </div>

            {/*
             * New Message Panel - conditionally mounted (no scroll-to-bottom).
             * Uses the same data-state CSS so animations are consistent.
             */}
            {(activeView === "new" || exitingView === "new") && (
              <div
                data-state={newState}
                className="chat-panel absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                <MiniNewMessage onStartChat={handleSelectChat} />
              </div>
            )}

            {/*
             * Chat Panel - keyed by chatPanelId (stable per chat session).
             *
             * The CRITICAL property: the same DOM node that was showing the
             * chat at the bottom transitions directly from data-state="active"
             * to data-state="exiting". React never remounts it - the scroll
             * position is preserved - and the browser fades it out from exactly
             * the position the user was reading. No scroll-to-top flash.
             *
             * When ENTERING a chat: fresh mount (chatId just set) -> starts at
             * data-state="entering" -> opacity:0 for 60 ms (MiniChatView scrolls
             * to bottom off-screen) -> fades in at the correct position.
             */}
            {chatPanelId && (
              <div
                key={chatPanelId}
                data-state={chatState}
                className="chat-panel absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                <MiniChatView chatId={chatPanelId} onBack={handleBack} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
