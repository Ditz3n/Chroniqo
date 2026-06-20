// src/app/[locale]/(protected)/messages/(components)/chat-view.tsx
"use client";

import { Smiley } from "@/app/(components)/smiley";
import { MutedInfoModal } from "@/components/moderation/muted-info-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  ChatAvatar,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiButton } from "@/components/ui/emoji-button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ReactionAdjustModal } from "@/components/ui/reaction-adjust-modal";
import { ReactionMenu } from "@/components/ui/reaction-menu";
import { ReactionModal } from "@/components/ui/reaction-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { DAILY_STATUSES } from "@/lib/constants";
import {
  useConversationMinigames,
  useConversations,
  useMessages,
  useQuickReactions,
} from "@/lib/hooks/use-chat";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getChatDisplayName } from "@/lib/utils/chat-helpers";
import { resolveChatSystemMessage } from "@/lib/utils/i18n-payload";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import {
  ApiConversation,
  ApiMessage,
  ApiMinigame,
  ChatViewProps,
  GameType,
  ReactionUser,
  UIMessage,
} from "@/types/app-types";
import {
  ChevronLeft,
  Circle,
  Copy,
  Dices,
  EyeOff,
  Flag,
  Gamepad2,
  Ghost,
  Hash,
  Image as ImageIcon,
  Info,
  Mic,
  MoreHorizontal,
  Reply,
  Send,
  Smile,
  Sticker,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatInfoSidebar } from "./chat-info-sidebar";
import { JoinCommunityChatModal } from "./join-community-chat-modal";
import { GameHistoryModal } from "./minigames/game-history-modal";
import { GameInfoModal } from "./minigames/game-info-modal";
import { GamePlayModal } from "./minigames/game-play-modal";
import { GameSystemMessage } from "./minigames/game-system-message";

const PAGE_SIZE = 30;

interface PendingMessage {
  id: string;
  content: string;
  replyToId?: string;
  isAnonymous: boolean;
  timestamp: Date;
}

function isSingleEmoji(str: string) {
  const trimmed = str.trim();
  if (!trimmed) return false;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    const segments = Array.from(segmenter.segment(trimmed));
    if (segments.length !== 1) return false;
  } else {
    if (trimmed.length > 10) return false;
  }
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(trimmed);
}

function CountdownBanner({
  targetDate,
  type,
  onExpire,
}: {
  targetDate: string;
  type: "deletion" | "expiry";
  onExpire: () => void;
}) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const hasExpiredRef = useRef(false);
  const expireTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const minutesLabel = (count: number) =>
      t("MessagesPage.minutes", { count });

    const updateTimer = () => {
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((target - now) / 1000));

      if (diffSeconds === 0) {
        setIsExpired(true);
        setTimeLeft("");
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          expireTimeoutRef.current = window.setTimeout(() => {
            onExpire();
          }, 1500);
        }
        return;
      }

      // Live countdown intervals
      if (diffSeconds <= 10) {
        setTimeLeft(`${diffSeconds}s`);
      } else if (diffSeconds <= 30) {
        setTimeLeft("30s");
      } else if (diffSeconds <= 60) {
        setTimeLeft(minutesLabel(1));
      } else if (diffSeconds <= 120) {
        setTimeLeft(minutesLabel(2));
      } else if (diffSeconds <= 300) {
        setTimeLeft(minutesLabel(5));
      } else if (diffSeconds <= 600) {
        setTimeLeft(minutesLabel(10));
      } else if (diffSeconds <= 1800 && type === "expiry") {
        setTimeLeft(minutesLabel(30)); // 30 mins warning for natural expiry
      } else if (diffSeconds <= 3600 && type === "expiry") {
        setTimeLeft(minutesLabel(60)); // 1 hour warning for natural expiry
      } else {
        // Don't render an extra line right after scheduling deletion.
        // The system message already states "15 minutes".
        setTimeLeft("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearInterval(interval);
      if (expireTimeoutRef.current !== null && !hasExpiredRef.current) {
        clearTimeout(expireTimeoutRef.current);
      }
    };
  }, [targetDate, t, onExpire, type]);

  if (isExpired) {
    return (
      <div className="flex justify-center mt-6 mb-2 animate-in fade-in duration-300">
        <p className="text-xs font-semibold text-brand text-center px-4 uppercase">
          {type === "deletion"
            ? t("MessagesPage.deleting_now")
            : t("MessagesPage.expiring_now")}
        </p>
      </div>
    );
  }

  if (!timeLeft) return null;

  // We fallback to just `timeLeft` if the new translations aren't added, ensuring nothing breaks
  return (
    <div className="flex justify-center mt-2 mb-2 animate-in fade-in duration-300">
      <p className="text-[10px] font-bold text-brand text-center px-4 uppercase tracking-wider">
        {type === "deletion"
          ? t("MessagesPage.deleting_in", { time: timeLeft }) || timeLeft
          : t("MessagesPage.expiring_in", { time: timeLeft }) || timeLeft}
      </p>
    </div>
  );
}

function getViewport(el: HTMLDivElement | null) {
  return (
    el?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]") ??
    null
  );
}

export function ChatView({
  chatId,
  onBack,
  pendingUser,
  onConversationCreated,
}: ChatViewProps) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const isMobile = useIsMobile();

  // Data
  const { data: convData, mutate: mutateConversations } = useConversations();

  const conversation: ApiConversation | undefined =
    convData?.conversations?.find((c: ApiConversation) => c.id === chatId) ||
    convData?.communityConversations?.find(
      (c: ApiConversation) => c.id === chatId,
    );
  const isPending =
    conversation?.participants?.find(
      (p: ApiConversation["participants"][number]) =>
        p.user.id === session?.user?.id,
    )?.status === "PENDING";

  const isAnyParticipantPending = conversation?.participants?.some(
    (p: ApiConversation["participants"][number]) => p.status === "PENDING",
  );
  const isChatPending = !chatId || isAnyParticipantPending;

  const isCommunityChat = !!conversation?.isCommunity;
  // True once the user presses "Join" and becomes a ConversationParticipant
  const isJoinedCommunityChat = isCommunityChat
    ? (conversation?.participants?.some(
        (p) => p.user.id === session?.user?.id,
      ) ?? false)
    : true;

  // Community-level moderation mute
  const myMuteInfo = isCommunityChat
    ? (conversation?.community?.mutes?.find(
        (m) => m.userId === session?.user?.id,
      ) ?? null)
    : null;
  const amICommunityMuted =
    !!myMuteInfo &&
    (!myMuteInfo.expiresAt || new Date(myMuteInfo.expiresAt) > new Date());

  // Global mute - only blocks community chats; direct and group chats are unaffected.
  // The globalMute field is enriched server-side in getConversations per community member.
  type MuteInfo = { reason: string | null; expiresAt: string | null } | null;
  type MemberWithGlobalMute = { userId: string; globalMute: MuteInfo };
  const myGlobalMuteInfo: MuteInfo = isCommunityChat
    ? ((
        conversation?.community?.members as MemberWithGlobalMute[] | undefined
      )?.find((m) => m.userId === session?.user?.id)?.globalMute ?? null)
    : null;
  const amIGloballyMuted =
    !!myGlobalMuteInfo &&
    (!myGlobalMuteInfo.expiresAt ||
      new Date(myGlobalMuteInfo.expiresAt) > new Date());

  const amIMuted = amICommunityMuted || amIGloballyMuted;

  // Prefer global mute info in the modal - it carries the platform-level reason/expiry
  const activeMuteInfo = amIGloballyMuted ? myGlobalMuteInfo : myMuteInfo;

  const otherParticipants =
    conversation?.participants?.filter(
      (p: ApiConversation["participants"][number]) =>
        p.user.id !== session?.user?.id,
    ) ||
    (pendingUser
      ? [
          {
            status: "ACCEPTED",
            user: {
              id: pendingUser.id,
              name: pendingUser.name ?? null,
              username: pendingUser.username ?? null,
              image: pendingUser.image ?? null,
              emailVerified: pendingUser.emailVerified ?? null,
            },
          },
        ]
      : []);
  const isGroup = isCommunityChat || otherParticipants.length > 1;
  const chatName = getChatDisplayName({
    name: conversation?.name,
    participants: otherParticipants,
  });
  const { data: msgData, mutate } = useMessages(chatId);
  const { data: quickReactionsData, mutate: mutateReactions } =
    useQuickReactions();
  const defaultReactions = quickReactionsData?.quickReactions || [
    "❤️",
    "😂",
    "😮",
    "😢",
    "😡",
    "👍",
  ];

  // Optimistic UI state queue
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const activeChatIdRef = useRef<string | undefined>(chatId);

  useEffect(() => {
    activeChatIdRef.current = chatId;
  }, [chatId]);

  const allMessages: UIMessage[] = useMemo(() => {
    const messages: ApiMessage[] = msgData?.messages || [];
    return messages.map((m) => {
      // Group reactions by emoji so the UI can render pills with user lists.
      const reactionMap = new Map<string, ReactionUser[]>();
      m.reactions.forEach((r) => {
        if (!reactionMap.has(r.emoji)) reactionMap.set(r.emoji, []);
        reactionMap.get(r.emoji)!.push({
          id: r.user.id,
          name: r.user.name || r.user.username || "Unknown",
          image: r.user.image,
          avatarEmoji: r.user.avatarEmoji,
          avatarBgColor: r.user.avatarBgColor,
          dailyStatusValue: r.user.dailyStatuses?.[0]?.value ?? null,
        });
      });
      const groupedReactions = Array.from(reactionMap.entries()).map(
        ([emoji, users]) => ({ emoji, users }),
      );

      // Resolve reply preview text by looking up the parent message in-memory.
      let replyText: string | undefined;
      if (m.replyToId) {
        const parent = messages.find((p) => p.id === m.replyToId);
        replyText = parent ? parent.content : "Message deleted";
      }

      // 1. Look up the sender in the participants array to see if they have a nickname
      const senderParticipant = conversation?.participants?.find(
        (p: ApiConversation["participants"][number]) =>
          p.user.id === m.sender.id,
      );
      const displayName =
        senderParticipant?.nickname ||
        m.sender.name ||
        m.sender.username ||
        "Unknown";

      // Anonymous messages from other users have id="anonymous" (set server-side).
      // Mods/admins receive the real sender instead (handled in getMessages).
      const isAnonymousSender = m.sender.id === "anonymous";

      // Normalize API message shape into the UIMessage model used by the view.
      return {
        id: m.id,
        originalSenderId: m.sender.id,
        sender: m.sender.id === session?.user?.id ? "me" : "them",
        senderName: isAnonymousSender
          ? t("MessagesPage.anonymous_user")
          : displayName,
        senderUsername: isAnonymousSender ? null : (m.sender.username ?? null),
        senderImage: isAnonymousSender ? null : (m.sender.image ?? null),
        senderAvatarEmoji: isAnonymousSender
          ? null
          : (m.sender.avatarEmoji ?? null),
        senderAvatarBgColor: isAnonymousSender
          ? null
          : (m.sender.avatarBgColor ?? null),
        senderDailyStatusValue:
          senderParticipant?.user?.dailyStatuses?.[0]?.value ?? null,
        text: m.content,
        timestamp: new Date(m.createdAt),
        replyTo: replyText,
        replyToId: m.replyToId ?? undefined,
        replyToStatus: m.dailyStatus
          ? {
              value: m.dailyStatus.value,
              note: m.dailyStatus.note,
              username:
                m.dailyStatus.user.username ||
                m.dailyStatus.user.name ||
                "Unknown",
            }
          : undefined,
        isDeleted: !!m.deletedAt,
        reactions: groupedReactions,
        isSystem: m.isSystem,
        isAnonymous: m.isAnonymous,
        messageType: m.messageType,
        minigameId: m.minigameId ?? null,
      };
    });
  }, [conversation?.participants, msgData?.messages, session?.user?.id, t]);

  const displayMessages = useMemo(() => {
    const mappedPending = pendingMessages.map((pm) => {
      const myParticipant = conversation?.participants?.find(
        (p: ApiConversation["participants"][number]) =>
          p.user.id === session?.user?.id,
      );
      const myName = pm.isAnonymous
        ? t("MessagesPage.anonymous_user")
        : myParticipant?.nickname ||
          session?.user?.name ||
          session?.user?.username ||
          "Unknown";

      return {
        id: pm.id,
        originalSenderId: session?.user?.id || "me",
        sender: "me",
        senderName: myName,
        senderUsername: pm.isAnonymous
          ? null
          : (session?.user?.username ?? null),
        senderImage: pm.isAnonymous ? null : (session?.user?.image ?? null),
        senderAvatarEmoji: pm.isAnonymous
          ? null
          : (session?.user?.avatarEmoji ?? null),
        senderAvatarBgColor: pm.isAnonymous
          ? null
          : (session?.user?.avatarBgColor ?? null),
        senderDailyStatusValue:
          myParticipant?.user?.dailyStatuses?.[0]?.value ?? null,
        text: pm.content,
        timestamp: pm.timestamp,
        replyTo: pm.replyToId
          ? allMessages.find((m) => m.id === pm.replyToId)?.text
          : undefined,
        replyToId: pm.replyToId,
        isDeleted: false,
        reactions: [],
        isSystem: false,
        isAnonymous: pm.isAnonymous,
        messageType: null,
        minigameId: null,
      } as UIMessage;
    });

    return [...allMessages, ...mappedPending].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }, [
    allMessages,
    pendingMessages,
    conversation?.participants,
    session?.user,
    t,
  ]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [revealedGhosts, setRevealedGhosts] = useState<Set<string>>(new Set());

  // Mark chat as read when viewed and whenever messages update
  useEffect(() => {
    if (chatId) {
      import("@/lib/hooks/use-chat").then(({ markChatAsRead }) => {
        markChatAsRead(chatId);
      });
    }
  }, [chatId, msgData?.messages]);

  const toggleGhost = (id: string) => {
    setRevealedGhosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const prevScrollHeightRef = useRef<number | null>(null);
  const hasMore = visibleCount < allMessages.length;
  const visibleMessages = useMemo(
    () =>
      displayMessages.slice(-Math.min(visibleCount, displayMessages.length)),
    [visibleCount, displayMessages],
  );

  // Group visible messages by date for separators
  const groupedMessages = useMemo(() => {
    return visibleMessages.reduce(
      (groups, message) => {
        const key = new Date(message.timestamp).toDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(message);
        return groups;
      },
      {} as Record<string, UIMessage[]>,
    );
  }, [visibleMessages]);

  // UI state
  const [showInfo, setShowInfo] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  useEffect(() => {
    const target = textareaRef.current;
    if (!target) return;
    target.style.overflowY = "hidden";
    target.style.height = "auto";
    const scrollH = target.scrollHeight;
    target.style.height = `${Math.min(scrollH, 128)}px`;
    target.style.overflowY = scrollH > 128 ? "auto" : "hidden";
  }, [inputText]);

  const [replyingTo, setReplyingTo] = useState<UIMessage | null>(null);
  const [lastReplyingTo, setLastReplyingTo] = useState<UIMessage | null>(null);
  const displayReplyingTo = replyingTo ?? lastReplyingTo;

  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(
    null,
  );
  const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);
  const [showEmojiPickerForMessage, setShowEmojiPickerForMessage] = useState<
    string | null
  >(null);
  const [showReactionAdjustModal, setShowReactionAdjustModal] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(
    null,
  );

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    right: number;
  } | null>(null);
  const [emojiPickerPlacement, setEmojiPickerPlacement] = useState<
    "above" | "below"
  >("above");
  const [moreMenuPlacement, setMoreMenuPlacement] = useState<"above" | "below">(
    "above",
  );

  // Closing animation states
  const [reactionMenuClosing, setReactionMenuClosing] = useState(false);
  const [emojiPickerClosing, setEmojiPickerClosing] = useState(false);
  const [moreMenuClosing, setMoreMenuClosing] = useState(false);
  const [reactionMenuClosingPos, setReactionMenuClosingPos] =
    useState<typeof menuPosition>(null);
  const [emojiPickerClosingPos, setEmojiPickerClosingPos] =
    useState<typeof menuPosition>(null);
  const [moreMenuClosingPos, setMoreMenuClosingPos] =
    useState<typeof menuPosition>(null);
  const [reactionMenuClosingSender, setReactionMenuClosingSender] = useState<
    "me" | "them"
  >("me");
  const [emojiPickerClosingSender, setEmojiPickerClosingSender] = useState<
    "me" | "them"
  >("me");

  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleExpire = useCallback(() => {
    if (!isMobile) {
      setIsFadingOut(true);
      setTimeout(() => onBack(), 300);
    } else {
      onBack();
    }
  }, [isMobile, onBack]);

  // Viewport width tracker
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const check = () => setIsNarrowViewport(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moreButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const menuPositionRef = useRef<typeof menuPosition>(null);
  const activeReactionSenderRef = useRef<"me" | "them">("me");
  const textareaRef = useRef<HTMLTextAreaElement>(null!);
  const [requestActionLoading, setRequestActionLoading] = useState<
    "ACCEPT" | "DECLINE" | null
  >(null);

  const [showMutedModal, setShowMutedModal] = useState(false);

  // Minigame state
  // Only poll for direct (1-on-1) chats; games in group/community chats are blocked by the API.
  const { data: activeGamesData, mutate: mutateGames } =
    useConversationMinigames(!isGroup && !isCommunityChat ? chatId : null);
  const activeGames: ApiMinigame[] = activeGamesData?.games ?? [];

  const [gameDropdownOpen, setGameDropdownOpen] = useState(false);
  // Single compound state for the info↔history dialog pair (mirrors edit-community-modal pattern).
  // Both dialogs stay mounted; only the open prop changes - guarantees X and outside-click
  // on the history modal always returns to the info modal.
  const [gameInfoData, setGameInfoData] = useState<{
    game: ApiMinigame;
    view: "info" | "history";
  } | null>(null);

  const [gamePlayModal, setGamePlayModal] = useState<ApiMinigame | null>(null);

  const [pendingGameType, setPendingGameType] = useState<GameType | null>(null);
  const [pendingGameHistoryOpen, setPendingGameHistoryOpen] = useState(false);

  // Convenience reference for the other participant in a 1-on-1 chat
  const directOpponent =
    !isGroup && !isCommunityChat ? (otherParticipants[0] ?? null) : null;

  const activeModalMessage = useMemo(
    () => displayMessages.find((m) => m.id === activeReactionMsgId),
    [displayMessages, activeReactionMsgId],
  );

  useEffect(() => {
    if (
      activeReactionMsgId &&
      (!activeModalMessage ||
        !activeModalMessage.reactions ||
        activeModalMessage.reactions.length === 0)
    ) {
      setActiveReactionMsgId(null);
    }
  }, [activeModalMessage, activeReactionMsgId]);

  useEffect(() => {
    menuPositionRef.current = menuPosition;
  }, [menuPosition]);

  // Date formatters
  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return t("MessagesPage.today");
    if (d.getTime() === yesterday.getTime()) return t("MessagesPage.yesterday");
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Scroll to bottom
  useEffect(() => {
    const viewport = getViewport(scrollAreaRef.current);
    if (viewport && visibleMessages.length > 0 && !isLoadingMore) {
      viewport.scrollTop = viewport.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMessages.length]);

  useEffect(() => {
    if (prevScrollHeightRef.current === null) return;
    const viewport = getViewport(scrollAreaRef.current);
    if (viewport)
      viewport.scrollTop = viewport.scrollHeight - prevScrollHeightRef.current;
    prevScrollHeightRef.current = null;
  }, [visibleCount]);

  // Load more on scroll up
  const handleScroll = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const viewport = getViewport(scrollAreaRef.current);
    if (!viewport || viewport.scrollTop > 80) return;
    prevScrollHeightRef.current = viewport.scrollHeight;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allMessages.length));
      setIsLoadingMore(false);
    }, 350);
  }, [hasMore, isLoadingMore, allMessages.length]);

  useEffect(() => {
    const viewport = getViewport(scrollAreaRef.current);
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Placement calculators
  const calcPosition = (rect: DOMRect) => ({
    top: rect.top,
    left: rect.left,
    right: window.innerWidth - rect.right,
  });

  const calcEmojiPickerPlacement = (rect: DOMRect) => {
    const spaceBelow = window.innerHeight - rect.top - 20;
    const spaceAbove = rect.top - 20;
    setEmojiPickerPlacement(
      spaceBelow >= 430 ? "below" : spaceAbove >= 430 ? "above" : "below",
    );
  };

  const calcMoreMenuPlacement = (rect: DOMRect) => {
    const spaceBelow = window.innerHeight - rect.top - 10;
    const spaceAbove = rect.top - 10;
    setMoreMenuPlacement(
      spaceBelow >= 160 ? "below" : spaceAbove >= 160 ? "above" : "below",
    );
  };

  // Close helpers
  const closeReactionMenu = useCallback((frozenPos?: typeof menuPosition) => {
    setReactionMenuClosingSender(activeReactionSenderRef.current);
    setReactionMenuClosingPos(frozenPos ?? menuPositionRef.current);
    setReactionMenuClosing(true);
    setTimeout(() => {
      setActiveReactionMenu(null);
      setReactionMenuClosing(false);
    }, 150);
  }, []);

  const closeEmojiPicker = useCallback((frozenPos?: typeof menuPosition) => {
    setEmojiPickerClosingSender(activeReactionSenderRef.current);
    setEmojiPickerClosingPos(frozenPos ?? menuPositionRef.current);
    setEmojiPickerClosing(true);
    setTimeout(() => {
      setShowEmojiPickerForMessage(null);
      setEmojiPickerClosing(false);
    }, 150);
  }, []);

  const closeMoreMenu = useCallback((frozenPos?: typeof menuPosition) => {
    setMoreMenuClosingPos(frozenPos ?? menuPositionRef.current);
    setMoreMenuClosing(true);
    setTimeout(() => {
      setActiveMoreMenu(null);
      setMoreMenuClosing(false);
    }, 150);
  }, []);

  // Click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(target))
        closeReactionMenu();
      const clickedMore = Array.from(moreButtonRefs.current.values()).some(
        (b) => b.contains(target),
      );
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target) &&
        !clickedMore
      )
        closeMoreMenu();
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target))
        closeEmojiPicker();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeReactionMenu, closeMoreMenu, closeEmojiPicker]);

  // Handlers
  const handleReply = (msg: UIMessage) => {
    setReplyingTo(msg);
    setLastReplyingTo(msg);
  };

  const handleEmojiSelectForMessage = async (msgId: string, emoji: string) => {
    setShowEmojiPickerForMessage(null);
    setActiveReactionMenu(null);
    try {
      const res = await fetch(`/api/messages/${msgId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error("Failed to toggle reaction", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: "DELETE",
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // Intentionally throws on failure so the JoinCommunityChatModal can catch it
  const handleJoinChat = async () => {
    if (!chatId) return;
    console.log("[ChatView] handleJoinChat chatId:", chatId);
    const res = await fetch(`/api/conversations/${chatId}/join`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to join community chat");
    await Promise.all([mutateConversations(), mutate()]);
    console.log("[ChatView] Joined community chat successfully");
  };

  const handleRequestAction = async (action: "ACCEPT" | "DECLINE") => {
    if (!chatId || requestActionLoading) return;
    setRequestActionLoading(action);
    try {
      const res = await fetch(`/api/conversations/${chatId}/participant`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to update request status");

      await Promise.all([mutateConversations(), mutate()]);
      if (action === "DECLINE") onBack();
    } catch (err) {
      console.error("Failed to handle message request action", err);
    } finally {
      setRequestActionLoading(null);
    }
  };

  type SendMessagePayload = {
    content: string;
    replyToId?: string | null;
    isAnonymous?: boolean;
  };

  const sendWithRetry = async (
    payload: SendMessagePayload,
    tempId: string,
    retryCount = 0,
  ) => {
    try {
      let resolvedChatId = activeChatIdRef.current;

      // Create conversation on first message if in pending mode
      if (!resolvedChatId && pendingUser) {
        const convRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantIds: [pendingUser.id],
            durationHours: 24,
          }),
        });
        if (!convRes.ok) throw new Error("Failed to create conversation");
        const convData = await convRes.json();
        resolvedChatId = convData.conversation.id;
        activeChatIdRef.current = resolvedChatId;
        onConversationCreated?.(resolvedChatId!);
      }

      const res = await fetch(`/api/conversations/${resolvedChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to send");

      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
      setShowOfflineWarning(false);
      mutate();
    } catch (err) {
      console.error("Message send failed, retrying in 3s...", err);
      // Trigger warning if this is the 2nd consecutive failure (approx 3s offline)
      if (retryCount >= 1) setShowOfflineWarning(true);
      setTimeout(() => sendWithRetry(payload, tempId, retryCount + 1), 3000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (amIMuted) {
      setShowMutedModal(true);
      return;
    }

    const content = inputText;
    const replyId = replyingTo?.id;
    const tempId =
      "temp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);

    const payload = {
      content,
      replyToId: replyId,
      ...(isCommunityChat && { isAnonymous }),
    };

    setPendingMessages((prev) => [
      ...prev,
      {
        id: tempId,
        content,
        replyToId: replyId,
        isAnonymous: isCommunityChat ? isAnonymous : false,
        timestamp: new Date(),
      },
    ]);

    setInputText("");
    setReplyingTo(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }

    sendWithRetry(payload, tempId);

    setTimeout(() => {
      const viewport = getViewport(scrollAreaRef.current);
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }, 100);
  };

  const menuItemCls =
    "flex items-center w-full px-4 py-3 text-sm font-medium text-foreground-60 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer group/item";

  // Shared portal position logic
  const reactionPos = reactionMenuClosing
    ? reactionMenuClosingPos
    : menuPosition;
  const emojiPos = emojiPickerClosing ? emojiPickerClosingPos : menuPosition;
  const morePos = moreMenuClosing ? moreMenuClosingPos : menuPosition;
  const effectiveReactionSender = reactionMenuClosing
    ? reactionMenuClosingSender
    : activeReactionSenderRef.current;
  const effectiveEmojiSender = emojiPickerClosing
    ? emojiPickerClosingSender
    : activeReactionSenderRef.current;

  return (
    <div
      className={cn(
        "relative flex flex-1 h-full overflow-hidden transition-opacity duration-300 ease-in-out",
        isFadingOut && "opacity-0",
      )}
    >
      <div className="flex flex-1 flex-col bg-background min-w-0 overflow-hidden">
        {/* Chat Header */}
        <div className="flex h-16 md:h-[88px] items-center justify-between border-b border-surface-border px-2 md:px-4 bg-background flex-shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <Tooltip
              content={
                t("FloatingChat.back") || t("MessagesPage.back") || "Back"
              }
              side="bottom"
            >
              <button
                onClick={onBack}
                className="md:hidden p-2 rounded-full hover:bg-foreground/5 text-foreground-60 transition-colors cursor-pointer flex-shrink-0"
                aria-label={
                  t("FloatingChat.back") || t("MessagesPage.back") || "Back"
                }
              >
                <ChevronLeft size={24} />
              </button>
            </Tooltip>
            <div className="flex items-center gap-3 cursor-pointer py-2 px-2 min-w-0">
              <ChatAvatar
                participants={
                  isCommunityChat
                    ? []
                    : isGroup
                      ? (conversation?.participants ?? otherParticipants)
                      : otherParticipants
                }
                chatImage={conversation?.image}
                className="h-10 w-10 flex-shrink-0"
                emojiSizeClass="text-2xl"
                ringParticipants={
                  isCommunityChat
                    ? []
                    : (conversation?.participants ?? otherParticipants)
                }
                avatarEmoji={conversation?.avatarEmoji}
                avatarBgColor={conversation?.avatarBgColor}
                name={conversation?.name}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base text-foreground truncate flex items-center gap-1">
                  {chatName}
                  {!isGroup &&
                    !isCommunityChat &&
                    otherParticipants.length === 1 &&
                    otherParticipants[0].user.emailVerified && (
                      <VerifiedBadge className="h-4 w-4" />
                    )}
                </span>
                <span className="text-sm font-medium text-foreground-40 truncate">
                  {t("MessagesPage.activeAgo", { time: "36 min." })}
                </span>
              </div>
            </div>
          </div>
          <Tooltip
            content={
              showInfo
                ? t("MessagesPage.close_chat_info_tooltip")
                : t("MessagesPage.open_chat_info_tooltip")
            }
            side="bottom"
          >
            <button
              onClick={() => setShowInfo((v) => !v)}
              className={cn(
                "flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer outline-none group",
                "p-2 rounded-full md:p-0 md:h-14 md:w-14 md:rounded-xl md:border",
                showInfo
                  ? "text-foreground-60 md:border-transparent xl:bg-surface xl:border-surface-border xl:text-brand"
                  : "text-foreground-60 hover:bg-foreground/5 md:border-transparent",
              )}
            >
              <Info className="size-6 transition-transform duration-200 group-hover:scale-110" />
            </button>
          </Tooltip>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 bg-surface/10">
          <div className="flex flex-col px-4 py-6">
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="h-4 w-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              </div>
            )}

            {/* User Information Area */}
            <div className="flex flex-col items-center py-10 gap-3">
              <ChatAvatar
                participants={
                  isCommunityChat
                    ? []
                    : isGroup
                      ? (conversation?.participants ?? otherParticipants)
                      : otherParticipants
                }
                chatImage={conversation?.image}
                className="h-20 w-20"
                emojiSizeClass="text-4xl"
                ringParticipants={
                  isCommunityChat
                    ? []
                    : (conversation?.participants ?? otherParticipants)
                }
                avatarEmoji={conversation?.avatarEmoji}
                avatarBgColor={conversation?.avatarBgColor}
                name={conversation?.name}
              />
              <div className="text-center px-4">
                <div className="font-bold font-heading text-lg text-foreground flex items-center justify-center gap-1.5">
                  {chatName}
                  {!isGroup &&
                    !isCommunityChat &&
                    otherParticipants.length === 1 &&
                    otherParticipants[0].user.emailVerified && (
                      <VerifiedBadge className="h-5 w-5" />
                    )}
                </div>
                {!isGroup && (
                  <div className="text-sm font-medium text-foreground-60">
                    u/{otherParticipants[0]?.user.username}
                  </div>
                )}
              </div>
              {!isGroup && otherParticipants[0] && (
                <Link
                  href={`/${locale}/u/${otherParticipants[0].user.username}`}
                  className="flex items-center gap-1.5 mt-1 px-4 py-1.5 rounded-full border border-surface-border bg-surface text-sm font-medium text-foreground-60 hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  {t("MessagesPage.view_profile")}
                </Link>
              )}
            </div>

            {/* Messages grouped by date */}
            {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <div key={dateKey}>
                {/* Date separator */}
                <div className="flex items-center justify-center py-4">
                  <span className="text-foreground-40 text-xs font-bold uppercase tracking-wider">
                    {formatDate(new Date(dateKey))}
                  </span>
                </div>

                {dateMessages.map((msg, index) => {
                  if (msg.isSystem) {
                    // Game events get their own interactive renderer
                    if (msg.minigameId) {
                      const linkedGame =
                        activeGames.find((g) => g.id === msg.minigameId) ??
                        null;
                      return (
                        <GameSystemMessage
                          key={msg.id}
                          msg={msg}
                          game={linkedGame}
                          currentUserId={session?.user?.id ?? ""}
                          onOpenInfoModal={(game) =>
                            setGameInfoData({ game, view: "info" })
                          }
                          onOpenPlayModal={(game) => setGamePlayModal(game)}
                        />
                      );
                    }

                    const text = resolveChatSystemMessage(
                      msg.text,
                      msg.messageType,
                      msg.senderName,
                      t,
                    );

                    // Identify if this is a deletion-related message
                    const isBrand =
                      msg.messageType === "DELETION_SCHEDULED" ||
                      msg.messageType === "DELETION_CANCELED";

                    return (
                      <div
                        key={msg.id}
                        className="flex justify-center w-full my-4"
                      >
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider text-center",
                            isBrand ? "text-brand" : "text-foreground-40",
                          )}
                        >
                          {text}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.sender === "me";
                  const isPending = msg.id.startsWith("temp-");

                  let nextMsg = null;
                  for (let i = index + 1; i < dateMessages.length; i++) {
                    if (!dateMessages[i].isSystem) {
                      nextMsg = dateMessages[i];
                      break;
                    }
                  }

                  let prevMsg = null;
                  for (let i = index - 1; i >= 0; i--) {
                    if (!dateMessages[i].isSystem) {
                      prevMsg = dateMessages[i];
                      break;
                    }
                  }

                  const isFirstInGroup =
                    !prevMsg ||
                    prevMsg.sender !== msg.sender ||
                    prevMsg.senderName !== msg.senderName ||
                    !!msg.replyTo ||
                    !!msg.replyToStatus;

                  const isLastInGroup =
                    !nextMsg ||
                    nextMsg.sender !== msg.sender ||
                    nextMsg.senderName !== msg.senderName ||
                    !!nextMsg.replyTo ||
                    !!nextMsg.replyToStatus;

                  const isNoteReaction =
                    !!msg.replyToStatus &&
                    !msg.isDeleted &&
                    isSingleEmoji(msg.text);
                  const isMostRecentVisibleMessage =
                    msg.id === visibleMessages[visibleMessages.length - 1]?.id;

                  let marginBottom = isLastInGroup ? "0.75rem" : "0.3rem";
                  if (nextMsg && msg.sender !== nextMsg.sender)
                    marginBottom = "1rem";
                  if (
                    !msg.isDeleted &&
                    msg.reactions &&
                    msg.reactions.length > 0
                  )
                    marginBottom = `${parseFloat(marginBottom) + (isMostRecentVisibleMessage ? 0 : 1.35)}rem`;
                  if (isNoteReaction)
                    marginBottom = `${parseFloat(marginBottom) + 1.0}rem`;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full group",
                        isMe ? "justify-end" : "justify-start",
                      )}
                      style={{ marginBottom }}
                    >
                      <div className="flex max-w-[75%] gap-2 items-end">
                        {!isMe && (
                          <div className="w-8 flex-shrink-0">
                            {isLastInGroup &&
                              (() => {
                                const tooltipText = msg.senderUsername
                                  ? `u/${msg.senderUsername}`
                                  : msg.originalSenderId === "anonymous"
                                    ? t("MessagesPage.anonymous_sender")
                                    : msg.senderName;
                                // Only allow toggling if the backend provided the real ID (meaning viewer is privileged)
                                const canToggleGhost =
                                  msg.isAnonymous &&
                                  (msg.sender === "me" ||
                                    msg.originalSenderId !== "anonymous");

                                return (
                                  <Tooltip content={tooltipText} side="top">
                                    <div>
                                      {msg.isAnonymous &&
                                      !revealedGhosts.has(msg.id) ? (
                                        <button
                                          onClick={() =>
                                            canToggleGhost
                                              ? toggleGhost(msg.id)
                                              : undefined
                                          }
                                          className={cn(
                                            "h-8 w-8 rounded-full border border-surface-border bg-surface flex items-center justify-center transition-colors ring-2 ring-offset-1 ring-offset-background",
                                            canToggleGhost
                                              ? "cursor-pointer hover:bg-surface-hover"
                                              : "cursor-default",
                                          )}
                                          style={
                                            {
                                              "--tw-ring-color":
                                                getMoodRingColor(
                                                  msg.senderDailyStatusValue,
                                                ),
                                            } as React.CSSProperties
                                          }
                                        >
                                          <Ghost className="h-4 w-4 text-foreground-60" />
                                        </button>
                                      ) : (
                                        <Avatar
                                          onClick={() =>
                                            msg.isAnonymous && canToggleGhost
                                              ? toggleGhost(msg.id)
                                              : undefined
                                          }
                                          className={cn(
                                            "h-8 w-8 border border-surface-border ring-2 ring-offset-1 ring-offset-background",
                                            msg.isAnonymous &&
                                              canToggleGhost &&
                                              "cursor-pointer",
                                          )}
                                          style={
                                            {
                                              "--tw-ring-color":
                                                getMoodRingColor(
                                                  msg.senderDailyStatusValue,
                                                ),
                                            } as React.CSSProperties
                                          }
                                        >
                                          {msg.senderImage && (
                                            <AvatarImage
                                              src={msg.senderImage}
                                            />
                                          )}
                                          {!msg.senderImage &&
                                          msg.senderAvatarBgColor ? (
                                            <IconAvatar
                                              emoji={msg.senderAvatarEmoji}
                                              bgColor={msg.senderAvatarBgColor}
                                              emojiSizeClass="text-base"
                                            />
                                          ) : (
                                            <AvatarFallback className="text-[10px] bg-surface font-bold text-foreground">
                                              {msg.senderName?.[0]?.toUpperCase() ||
                                                "?"}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                      )}
                                    </div>
                                  </Tooltip>
                                );
                              })()}
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex flex-col gap-1 min-w-0",
                            isMe ? "items-end" : "items-start",
                          )}
                        >
                          {!isNoteReaction &&
                            msg.replyToStatus &&
                            !msg.isDeleted && (
                              <div className="mb-2 flex flex-col">
                                <div
                                  className={cn(
                                    "text-xs font-semibold text-foreground-40 mb-1",
                                    isMe
                                      ? "text-right mr-[4px]"
                                      : "text-left ml-[4px]",
                                  )}
                                >
                                  {isMe
                                    ? t("MessagesPage.replying_to_status", {
                                        user: msg.replyToStatus.username,
                                      })
                                    : t("MessagesPage.replied_to_status_you")}
                                </div>
                                <div
                                  className={cn(
                                    "flex",
                                    isMe ? "justify-end" : "justify-start",
                                  )}
                                >
                                  <div
                                    className="flex flex-col gap-1.5 p-3 rounded-2xl max-w-[240px] opacity-90 border border-white/10 shadow-sm"
                                    style={{
                                      backgroundColor:
                                        DAILY_STATUSES[msg.replyToStatus.value]
                                          .color,
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 flex-shrink-0">
                                        <Smiley
                                          statusValue={msg.replyToStatus.value}
                                          color="white"
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-white/90 truncate">
                                        {t(
                                          DAILY_STATUSES[
                                            msg.replyToStatus.value
                                          ].labelKey,
                                        )}
                                      </span>
                                    </div>
                                    {msg.replyToStatus.note && (
                                      <p
                                        className="text-sm text-white/90 font-medium line-clamp-3 break-words overflow-x-hidden"
                                        style={{ overflowWrap: "anywhere" }}
                                      >
                                        {'"'}
                                        {msg.replyToStatus.note}
                                        {'"'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          {!isNoteReaction && msg.replyTo && !msg.isDeleted && (
                            <div className="mb-2">
                              {isMe ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="text-xs font-semibold text-foreground-40 mr-[14px]">
                                    {t("MessagesPage.replying_to", {
                                      user:
                                        msg.senderName ||
                                        t("MessagesPage.unknown_user"),
                                    })}
                                  </div>
                                  <div className="flex items-stretch gap-2">
                                    <div className="text-sm rounded-2xl px-4 py-2.5 truncate max-w-[160px] bg-surface border border-surface-border text-foreground-60">
                                      {msg.replyTo}
                                    </div>
                                    <div className="w-1 bg-surface-border rounded-full flex-shrink-0" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  <div className="text-xs font-semibold text-foreground-40 ml-[14px]">
                                    {t("MessagesPage.replied_to_you", {
                                      user:
                                        msg.senderName ||
                                        t("MessagesPage.unknown_user"),
                                    })}
                                  </div>
                                  <div className="flex items-stretch gap-2">
                                    <div className="w-1 bg-surface-border rounded-full flex-shrink-0" />
                                    <div className="text-sm rounded-2xl px-4 py-2.5 truncate max-w-[160px] bg-surface border border-surface-border text-foreground-60">
                                      {msg.replyTo}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={cn(
                              "relative flex items-end gap-1.5",
                              isPending && "opacity-60",
                            )}
                            data-bubble-wrapper
                          >
                            {isMe && msg.isAnonymous && (
                              <div
                                className="mb-2 opacity-50"
                                title={t("MessagesPage.anonymous_user")}
                              >
                                <Ghost className="h-4 w-4 text-foreground" />
                              </div>
                            )}

                            <div>
                              {isNoteReaction ? (
                                <div className="flex flex-col gap-1 relative">
                                  <div
                                    className={cn(
                                      "text-xs font-semibold text-foreground-40",
                                      isMe
                                        ? "text-right mr-[4px]"
                                        : "text-left ml-[4px]",
                                    )}
                                  >
                                    {isMe
                                      ? t("MessagesPage.reacted_to_status", {
                                          user: msg.replyToStatus!.username,
                                        })
                                      : t("MessagesPage.reacted_to_status_you")}
                                  </div>

                                  <div
                                    className="relative p-3 rounded-2xl max-w-[240px] flex flex-col gap-1.5 shadow-sm border border-white/10 opacity-90"
                                    style={{
                                      backgroundColor:
                                        DAILY_STATUSES[msg.replyToStatus!.value]
                                          .color,
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 flex-shrink-0">
                                        <Smiley
                                          statusValue={msg.replyToStatus!.value}
                                          color="white"
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-white/90 truncate">
                                        {t(
                                          DAILY_STATUSES[
                                            msg.replyToStatus!.value
                                          ].labelKey,
                                        )}
                                      </span>
                                    </div>
                                    {msg.replyToStatus!.note && (
                                      <p
                                        className="text-sm text-white/90 font-medium line-clamp-3 break-words overflow-x-hidden"
                                        style={{ overflowWrap: "anywhere" }}
                                      >
                                        {'"'}
                                        {msg.replyToStatus!.note}
                                        {'"'}
                                      </p>
                                    )}

                                    <div
                                      className={cn(
                                        "absolute -bottom-6 text-[44px] drop-shadow-xl z-20 select-none",
                                        isMe ? "-right-3" : "-left-3",
                                      )}
                                      style={{ lineHeight: 1 }}
                                    >
                                      {msg.text}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "px-4 py-2.5 text-sm break-words whitespace-pre-wrap font-medium w-fit max-w-[min(72vw,36rem)] [overflow-wrap:anywhere]",
                                    msg.isDeleted && "italic",
                                    isMe
                                      ? [
                                          msg.isDeleted
                                            ? "bg-brand/60 text-white/70"
                                            : "bg-brand text-white",
                                          "rounded-l-2xl",
                                          isFirstInGroup
                                            ? "rounded-tr-2xl"
                                            : "rounded-tr-[6px]",
                                          isLastInGroup
                                            ? "rounded-br-2xl"
                                            : "rounded-br-[6px]",
                                        ]
                                      : [
                                          msg.isDeleted
                                            ? "bg-surface/50 text-foreground-40"
                                            : "bg-surface border border-surface-border text-foreground",
                                          "rounded-r-2xl",
                                          isFirstInGroup
                                            ? "rounded-tl-2xl"
                                            : "rounded-tl-[6px]",
                                          isLastInGroup
                                            ? "rounded-bl-2xl"
                                            : "rounded-bl-[6px]",
                                        ],
                                  )}
                                >
                                  {msg.isDeleted
                                    ? t("MessagesPage.message_deleted")
                                    : msg.text}
                                </div>
                              )}
                            </div>

                            {/* Hover action buttons (Hide if deleted or pending) */}
                            {!msg.isDeleted && !isPending && (
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity z-50",
                                  isMe
                                    ? "right-[calc(100%+4px)] flex-row-reverse"
                                    : "left-[calc(100%+4px)] flex-row",
                                  activeReactionMenu === msg.id ||
                                    activeMoreMenu === msg.id ||
                                    showEmojiPickerForMessage === msg.id
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100",
                                )}
                              >
                                {/* Emoji */}
                                {(!isCommunityChat ||
                                  isJoinedCommunityChat) && (
                                  <Tooltip
                                    content={t("MessagesPage.react_tooltip")}
                                    side="top"
                                  >
                                    <div
                                      className="group/btn flex items-center justify-center w-[26px] h-[26px] rounded-full cursor-pointer hover:bg-foreground/5 hover:scale-110 bg-background shadow-sm border border-surface-border md:border-transparent md:bg-transparent md:shadow-none transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        const bubbleWrapper =
                                          e.currentTarget.closest<HTMLElement>(
                                            "[data-bubble-wrapper]",
                                          );
                                        const bubbleBottom =
                                          bubbleWrapper?.getBoundingClientRect()
                                            .bottom ?? rect.bottom;
                                        const MENU_WIDTH = 320;
                                        const spaceOnRight =
                                          window.innerWidth - rect.left;
                                        const spaceOnLeft = rect.right;
                                        const anchor =
                                          spaceOnRight >= MENU_WIDTH
                                            ? "left"
                                            : spaceOnLeft >= MENU_WIDTH
                                              ? "right"
                                              : spaceOnRight >= spaceOnLeft
                                                ? "left"
                                                : "right";
                                        setMenuPosition({
                                          top: bubbleBottom,
                                          left: rect.left,
                                          right: window.innerWidth - rect.right,
                                        });
                                        activeReactionSenderRef.current =
                                          anchor === "right" ? "me" : "them";
                                        setActiveReactionMenu(
                                          activeReactionMenu === msg.id
                                            ? null
                                            : msg.id,
                                        );
                                      }}
                                    >
                                      <Smile className="h-[14px] w-[14px] md:h-[18px] md:w-[18px] text-foreground-40 group-hover/btn:text-foreground transition-all" />
                                    </div>
                                  </Tooltip>
                                )}

                                {/* Reply */}
                                {(!isCommunityChat ||
                                  isJoinedCommunityChat) && (
                                  <Tooltip
                                    content={t("MessagesPage.reply_tooltip")}
                                    side="top"
                                  >
                                    <div
                                      className="group/btn flex items-center justify-center w-[26px] h-[26px] rounded-full cursor-pointer hover:bg-foreground/5 hover:scale-110 bg-background shadow-sm border border-surface-border md:border-transparent md:bg-transparent md:shadow-none transition-all"
                                      onClick={() => handleReply(msg)}
                                    >
                                      <Reply className="h-[14px] w-[14px] md:h-[18px] md:w-[18px] text-foreground-40 group-hover/btn:text-foreground transition-all" />
                                    </div>
                                  </Tooltip>
                                )}

                                {/* More */}
                                <Tooltip
                                  content={t("MessagesPage.more_tooltip")}
                                  side="top"
                                >
                                  <div
                                    ref={(el) => {
                                      if (el)
                                        moreButtonRefs.current.set(
                                          msg.id,
                                          el as unknown as HTMLButtonElement,
                                        );
                                      else
                                        moreButtonRefs.current.delete(msg.id);
                                    }}
                                    className="group/btn flex items-center justify-center w-[26px] h-[26px] rounded-full relative cursor-pointer hover:bg-foreground/5 hover:scale-110 bg-background shadow-sm border border-surface-border md:border-transparent md:bg-transparent md:shadow-none transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const pos = calcPosition(rect);
                                      calcMoreMenuPlacement(rect);
                                      if (activeMoreMenu === msg.id)
                                        closeMoreMenu(pos);
                                      else {
                                        setMenuPosition(pos);
                                        setActiveMoreMenu(msg.id);
                                      }
                                    }}
                                  >
                                    <MoreHorizontal className="h-[14px] w-[14px] md:h-[18px] md:w-[18px] text-foreground-40 group-hover/btn:text-foreground transition-all" />
                                  </div>
                                </Tooltip>
                              </div>
                            )}

                            {/* Reaction pill (Hide if deleted or pending) */}
                            {!msg.isDeleted &&
                              !isPending &&
                              msg.reactions &&
                              msg.reactions.length > 0 && (
                                <div
                                  className={cn(
                                    "absolute flex z-30",
                                    isNoteReaction
                                      ? isMe
                                        ? "-bottom-9 right-12"
                                        : "-bottom-9 left-12"
                                      : isMe
                                        ? "-bottom-3.5 right-0"
                                        : "-bottom-3.5 left-0",
                                  )}
                                  onClick={() => setActiveReactionMsgId(msg.id)}
                                >
                                  <div className="flex items-center justify-center gap-0.5 min-w-[36px] h-[24px] px-2 rounded-full border border-surface-border bg-surface-opaque shadow-sm cursor-pointer hover:bg-surface-hover transition-colors select-none">
                                    <span
                                      className="text-sm leading-none -ml-0.5 flex"
                                      style={{ transform: "translateY(-1px)" }}
                                    >
                                      {[...msg.reactions]
                                        .sort(
                                          (a, b) =>
                                            b.users.length - a.users.length,
                                        )
                                        .slice(0, 2)
                                        .map((r) => r.emoji)
                                        .join("")}
                                    </span>
                                    <span className="text-[10px] font-bold text-foreground-60 leading-none ml-0.5">
                                      {msg.reactions.reduce(
                                        (sum, r) => sum + r.users.length,
                                        0,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Countdown System Messages */}
            {msgData?.conversation?.deletionScheduledAt ? (
              <CountdownBanner
                targetDate={msgData.conversation.deletionScheduledAt}
                type="deletion"
                onExpire={handleExpire}
              />
            ) : msgData?.conversation?.expiresAt && !isCommunityChat ? (
              <CountdownBanner
                targetDate={msgData.conversation.expiresAt}
                type="expiry"
                onExpire={handleExpire}
              />
            ) : null}
          </div>
        </ScrollArea>

        {/* Input Area */}
        {isCommunityChat && !isJoinedCommunityChat ? (
          <div className="flex flex-col gap-3 bg-surface border-t border-surface-border p-4 pb-20 md:pb-4 z-20 flex-shrink-0">
            <p className="text-xs text-foreground-60 text-center">
              {t("MessagesPage.join_community_chat_description")}
            </p>
            <Button
              onClick={() => setShowJoinModal(true)}
              className="w-full cursor-pointer"
            >
              {t("MessagesPage.join_community_chat")}
            </Button>
          </div>
        ) : msgData?.conversation?.isMuted ? (
          <div className="flex items-center justify-center bg-surface border-t border-surface-border px-4 py-5 pb-20 md:pb-5">
            <p className="text-sm font-medium text-foreground-40 text-center">
              {t("MessagesPage.muted_cannot_send")}
            </p>
          </div>
        ) : isPending ? (
          <div className="flex flex-col gap-3 bg-surface border-t border-surface-border p-4 pb-20 md:pb-4 z-20 flex-shrink-0">
            <p className="text-xs text-foreground-60 text-center">
              {t("chat_requests.pending_warning")}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleRequestAction("DECLINE")}
                variant="outline"
                className="flex-1 cursor-pointer"
                disabled={!!requestActionLoading}
              >
                {requestActionLoading === "DECLINE" ? (
                  <div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  t("chat_requests.decline")
                )}
              </Button>
              <Button
                onClick={() => handleRequestAction("ACCEPT")}
                className="flex-1 cursor-pointer"
                disabled={!!requestActionLoading}
              >
                {requestActionLoading === "ACCEPT" ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t("chat_requests.accept")
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col bg-background border-t border-surface-border p-3 pb-16 md:pb-3 flex-shrink-0 relative">
            {/* Offline warning */}
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 transition-all duration-300 z-50 flex items-center shadow-lg rounded-full",
                showOfflineWarning
                  ? "-top-10 opacity-100"
                  : "-top-6 opacity-0 pointer-events-none",
              )}
            >
              <div className="bg-brand text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap">
                {t("MessagesPage.offline_warning") ||
                  "Forbindelse tabt. Prøver igen..."}
              </div>
            </div>

            {/* Reply preview */}
            <div
              className="reply-preview mx-1"
              data-open={replyingTo ? "true" : "false"}
            >
              <div>
                <div className="flex items-center justify-between bg-surface rounded-xl px-4 py-2 border border-surface-border mb-2">
                  <div className="flex flex-col overflow-hidden">
                    <div className="text-xs font-bold text-brand uppercase tracking-wider">
                      {t("MessagesPage.replying_to", {
                        user: displayReplyingTo?.senderName || "Unknown",
                      })}
                    </div>
                    <div className="text-sm font-medium text-foreground-60 mt-0.5 truncate">
                      {displayReplyingTo?.text}
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-full hover:bg-foreground/10 text-foreground-40 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              {/* Anonymity toggle - community chats only */}
              {isCommunityChat && isJoinedCommunityChat && (
                <Tooltip
                  content={t("MessagesPage.anonymous_toggle")}
                  side="top"
                >
                  <button
                    type="button"
                    onClick={() => setIsAnonymous((v) => !v)}
                    aria-label={t("MessagesPage.anonymous_toggle")}
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer flex-shrink-0",
                      isAnonymous
                        ? "bg-brand/20 text-brand"
                        : "text-foreground-40 hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}

              {/* Minigame launcher - direct 1-on-1 chats only */}
              {!isGroup &&
                !isCommunityChat &&
                directOpponent &&
                !isChatPending && (
                  <DropdownMenu
                    open={gameDropdownOpen}
                    onOpenChange={setGameDropdownOpen}
                  >
                    <Tooltip content={t("minigames.open_tooltip")} side="top">
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("minigames.open_aria")}
                          className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer focus:outline-none",
                            gameDropdownOpen
                              ? "bg-brand/20 text-brand"
                              : "text-foreground-40 hover:text-foreground hover:bg-foreground/5",
                          )}
                        >
                          <Gamepad2 className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </Tooltip>
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      className="w-52 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0"
                    >
                      <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
                        {t("minigames.dropdown_label")}
                      </DropdownMenuLabel>
                      {activeGames.length > 0 && (
                        <div className="px-4 py-2 text-[10px] font-medium text-foreground-40 bg-foreground/3 border-b border-surface-border">
                          {t("minigames.one_game_limit")}
                        </div>
                      )}
                      {(
                        [
                          { type: "TIC_TAC_TOE" as const, icon: Hash },
                          { type: "CONNECT_FOUR" as const, icon: Circle },
                          { type: "KNUCKLEBONES" as const, icon: Dices },
                        ] as const
                      ).map(({ type, icon: Icon }) => {
                        // A single active/pending game of ANY type blocks all challenges.
                        const isBlocked = activeGames.length > 0;
                        return (
                          <DropdownMenuItem
                            key={type}
                            disabled={isBlocked}
                            onClick={() => {
                              if (isBlocked) return;
                              setGameDropdownOpen(false);
                              setPendingGameType(type);
                            }}
                            className={cn(
                              "py-2.5 px-4 rounded-none w-full font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5",
                              isBlocked
                                ? "text-foreground-40 cursor-not-allowed opacity-60"
                                : "text-foreground-60 cursor-pointer",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 mr-2.5",
                                isBlocked
                                  ? "text-foreground-40"
                                  : "text-foreground-60 transition-transform duration-200 group-hover/item:scale-110",
                              )}
                            />
                            <span>{t(`minigames.${type.toLowerCase()}`)}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              <div className="flex-1 flex items-center gap-2 rounded-3xl border border-surface-border bg-surface px-3 py-1.5 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all min-h-[44px]">
                <div className="flex items-center justify-center">
                  <EmojiButton
                    onEmojiSelect={(e) => setInputText((p) => p + e)}
                    triggerType="smile"
                    align="left"
                    placement="above"
                    inputRef={textareaRef}
                    renderWithTooltip={(trigger, isOpen) =>
                      !isOpen ? (
                        <Tooltip
                          content={t("FloatingChat.emoji_picker")}
                          side="top"
                        >
                          {trigger}
                        </Tooltip>
                      ) : (
                        trigger
                      )
                    }
                  />
                </div>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  maxLength={1000}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (amIMuted) {
                        setShowMutedModal(true);
                        return;
                      }
                      handleSend();
                    }
                  }}
                  placeholder={t("MessagesPage.messagePlaceholder")}
                  className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-foreground-40 text-foreground font-medium resize-none min-h-[28px] break-words whitespace-pre-wrap"
                  rows={1}
                  style={{ overflowY: "hidden" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.overflowY = "hidden";
                    target.style.height = "auto";
                    const scrollH = target.scrollHeight;
                    target.style.height = `${Math.min(scrollH, 128)}px`;
                    target.style.overflowY = scrollH > 128 ? "auto" : "hidden";
                  }}
                />

                {/* Right side: icons + send button */}
                <div className="relative flex-shrink-0 flex items-center text-foreground-40 h-8">
                  {/* Icons - mobile: hide when typing. Desktop: always visible */}
                  <div
                    className={cn(
                      "flex items-center h-8 gap-2.5 mr-1 transition-all duration-200 ease-in-out",
                      !!inputText.trim() &&
                        "md:opacity-100 md:translate-x-0 translate-x-3 opacity-0 pointer-events-none md:pointer-events-auto",
                    )}
                  >
                    <Tooltip content={t("FloatingChat.voice_note")} side="top">
                      <button
                        type="button"
                        aria-label={t("FloatingChat.voice_note")}
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
                      >
                        <Mic className="h-5 w-5 hover:text-foreground transition-colors" />
                      </button>
                    </Tooltip>
                    <Tooltip
                      content={t("FloatingChat.image_upload")}
                      side="top"
                    >
                      <button
                        type="button"
                        aria-label={t("FloatingChat.image_upload")}
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
                      >
                        <ImageIcon className="h-5 w-5 hover:text-foreground transition-colors" />
                      </button>
                    </Tooltip>
                    <Tooltip content={t("FloatingChat.gif_picker")} side="top">
                      <button
                        type="button"
                        aria-label={t("FloatingChat.gif_picker")}
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
                      >
                        <Sticker className="h-5 w-5 hover:text-foreground transition-colors" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Send button - mobile: slides in when typing. Desktop: always visible */}
                  <Tooltip content={t("FloatingChat.send")} side="top">
                    <button
                      onClick={handleSend}
                      aria-label={t("FloatingChat.send")}
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full bg-brand text-white cursor-pointer transition-all duration-200 ease-in-out",
                        "md:static md:opacity-100 md:scale-100 md:translate-x-0 md:translate-y-0 md:top-auto md:ml-1 md:pointer-events-auto md:hover:scale-105",
                        "absolute -right-1 top-1/2 -translate-y-1/2",
                        !!inputText.trim()
                          ? "opacity-100 scale-100 translate-x-0 hover:scale-105 active:scale-95"
                          : "opacity-0 scale-50 translate-x-3 pointer-events-none",
                      )}
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Join Community Chat Modal */}
      <JoinCommunityChatModal
        isOpen={showJoinModal}
        communityName={conversation?.community?.name ?? ""}
        onClose={() => setShowJoinModal(false)}
        onConfirm={handleJoinChat}
      />

      {/* Info Sidebar */}
      <ChatInfoSidebar
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        chatId={chatId}
        conversationMeta={msgData?.conversation}
        onMutate={mutate}
        disabled={!chatId}
      />

      {/* -- Portals ---------------------------------------------------------- */}

      {/* Reaction Modal */}
      {typeof window !== "undefined" &&
        createPortal(
          <ReactionModal
            isOpen={
              !!activeReactionMsgId && !!activeModalMessage?.reactions?.length
            }
            onClose={() => setActiveReactionMsgId(null)}
            reactions={activeModalMessage?.reactions || []}
            onRemove={(emoji) => {
              if (activeReactionMsgId)
                handleEmojiSelectForMessage(activeReactionMsgId, emoji);
            }}
          />,
          document.body,
        )}

      {/* Reaction Menu */}
      {typeof window !== "undefined" &&
        (activeReactionMenu !== null || reactionMenuClosing) &&
        reactionPos &&
        createPortal(
          <ReactionMenu
            ref={reactionMenuRef}
            className={cn(
              "fixed",
              reactionMenuClosing
                ? "animate-reaction-menu-out"
                : "animate-reaction-menu-in",
            )}
            style={{
              top: `${reactionPos.top + 8}px`,
              left: isNarrowViewport
                ? effectiveReactionSender === "them"
                  ? "16px"
                  : "auto"
                : effectiveReactionSender === "them"
                  ? `${reactionPos.left}px`
                  : "auto",
              right: isNarrowViewport
                ? effectiveReactionSender === "me"
                  ? "16px"
                  : "auto"
                : effectiveReactionSender === "me"
                  ? `${reactionPos.right}px`
                  : "auto",
              transform: "none",
              zIndex: 9999,
              maxWidth: "95vw",
            }}
            reactions={defaultReactions}
            onReactionSelect={(emoji) => {
              handleEmojiSelectForMessage(activeReactionMenu ?? "", emoji);
              closeReactionMenu(menuPosition);
            }}
            onPlusClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              calcEmojiPickerPlacement(rect);
              const PICKER_WIDTH = 340;
              const spaceOnRight = window.innerWidth - rect.left;
              const spaceOnLeft = rect.right;
              const anchor =
                spaceOnRight >= PICKER_WIDTH
                  ? "left"
                  : spaceOnLeft >= PICKER_WIDTH
                    ? "right"
                    : spaceOnRight >= spaceOnLeft
                      ? "left"
                      : "right";
              // Close reaction menu FIRST so it freezes with the current sender,
              // then update the ref for the incoming emoji picker
              closeReactionMenu(menuPosition);
              activeReactionSenderRef.current =
                anchor === "right" ? "me" : "them";
              setMenuPosition(calcPosition(rect));
              setShowEmojiPickerForMessage(activeReactionMenu);
            }}
          />,
          document.body,
        )}

      {/* Emoji Picker */}
      {typeof window !== "undefined" &&
        (showEmojiPickerForMessage !== null || emojiPickerClosing) &&
        (window.innerWidth < 768 || emojiPos) &&
        createPortal(
          window.innerWidth < 768 ? (
            // Mobile: outer div handles centering, inner div handles animation
            // Keeping them separate prevents the animation's transform from
            // overriding the centering transform
            <div
              ref={emojiPickerRef}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 9999,
                maxWidth: "95vw",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  emojiPickerClosing
                    ? "animate-emoji-picker-out"
                    : "animate-emoji-picker-in",
                )}
              >
                <EmojiPicker
                  onEmojiSelect={(emoji) => {
                    handleEmojiSelectForMessage(
                      showEmojiPickerForMessage ?? "",
                      emoji,
                    );
                    closeEmojiPicker();
                  }}
                  mode="reaction"
                  currentReactions={defaultReactions}
                  onAdjustReactions={() => {
                    closeEmojiPicker();
                    setShowReactionAdjustModal(true);
                  }}
                />
              </div>
            </div>
          ) : (
            // Desktop: single div with position + animation
            <div
              ref={emojiPickerRef}
              className={cn(
                "fixed",
                emojiPickerClosing
                  ? "animate-emoji-picker-out"
                  : "animate-emoji-picker-in",
              )}
              style={{
                top: emojiPos
                  ? emojiPickerPlacement === "below"
                    ? `${emojiPos.top + 10}px`
                    : `${emojiPos.top - 430}px`
                  : "50%",
                left:
                  emojiPos && effectiveEmojiSender === "them"
                    ? `${emojiPos.left}px`
                    : "auto",
                right:
                  emojiPos && effectiveEmojiSender === "me"
                    ? `${emojiPos.right}px`
                    : "auto",
                zIndex: 9999,
                maxWidth: "95vw",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  handleEmojiSelectForMessage(
                    showEmojiPickerForMessage ?? "",
                    emoji,
                  );
                  closeEmojiPicker();
                }}
                mode="reaction"
                currentReactions={defaultReactions}
                onAdjustReactions={() => {
                  closeEmojiPicker();
                  setShowReactionAdjustModal(true);
                }}
              />
            </div>
          ),
          document.body,
        )}

      {/* More Menu */}
      {typeof window !== "undefined" &&
        (activeMoreMenu !== null || moreMenuClosing) &&
        morePos &&
        createPortal(
          <div
            ref={moreMenuRef}
            className={cn(
              "fixed bg-surface-opaque backdrop-blur-md rounded-xl shadow-xl border border-surface-border min-w-[200px] overflow-hidden cursor-default z-[100]",
              moreMenuClosing ? "animate-dropdown-out" : "animate-dropdown-in",
            )}
            style={{
              top:
                moreMenuPlacement === "below"
                  ? `${morePos.top + 10}px`
                  : `${morePos.top - 180}px`,
              left: isMobile ? "50%" : "auto",
              right: isMobile ? "auto" : `${morePos.right}px`,
              transform: isMobile ? "translateX(-50%)" : "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border flex flex-col gap-0.5">
              <span>
                {new Date(
                  displayMessages.find(
                    (m) =>
                      m.id ===
                      (activeMoreMenu ??
                        (moreMenuClosingPos && activeMoreMenu)),
                  )?.timestamp ?? new Date(),
                ).toLocaleString()}
              </span>
              {(() => {
                const msgId =
                  activeMoreMenu ?? (moreMenuClosingPos && activeMoreMenu);
                const msg = displayMessages.find((m) => m.id === msgId);
                return msg?.senderUsername ? (
                  <span className="normal-case opacity-75">
                    u/{msg.senderUsername}
                  </span>
                ) : null;
              })()}
            </div>
            <div>
              <div
                className={menuItemCls}
                onClick={() => {
                  const msg = displayMessages.find(
                    (m) => m.id === activeMoreMenu,
                  );
                  if (msg) navigator.clipboard.writeText(msg.text);
                  closeMoreMenu();
                }}
              >
                <Copy className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110" />
                <span>{t("MessagesPage.copy_message")}</span>
              </div>

              {displayMessages.find((m) => m.id === activeMoreMenu)?.sender ===
                "me" && (
                <>
                  <div className="border-t border-surface-border" />
                  <div
                    className={cn(
                      menuItemCls,
                      "text-brand hover:bg-foreground/5 hover:text-brand",
                    )}
                    onClick={() => {
                      const msgId = activeMoreMenu;
                      closeMoreMenu();
                      if (msgId) handleDeleteMessage(msgId);
                    }}
                  >
                    <Trash2 className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110" />
                    <span>{t("MessagesPage.delete_message")}</span>
                  </div>
                </>
              )}

              {displayMessages.find((m) => m.id === activeMoreMenu)?.sender ===
                "them" && (
                <>
                  <div className="border-t border-surface-border" />
                  <div
                    className={cn(menuItemCls, "text-brand hover:text-brand")}
                    onClick={() => closeMoreMenu()}
                  >
                    <Flag className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110" />
                    <span>{t("MessagesPage.report_message")}</span>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Muted Info Modal */}
      {typeof window !== "undefined" &&
        createPortal(
          <MutedInfoModal
            isOpen={showMutedModal}
            onClose={() => setShowMutedModal(false)}
            reason={activeMuteInfo?.reason ?? null}
            mutedUntil={activeMuteInfo?.expiresAt ?? null}
          />,
          document.body,
        )}

      {/* Reaction Adjust Modal */}
      {typeof window !== "undefined" &&
        createPortal(
          <ReactionAdjustModal
            isOpen={showReactionAdjustModal}
            onClose={() => setShowReactionAdjustModal(false)}
            currentReactions={defaultReactions}
            onReactionsUpdate={async (newReactions) => {
              mutateReactions({ quickReactions: newReactions }, false);
              try {
                await fetch("/api/user/quick-reactions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ emojis: newReactions }),
                });
              } catch (err) {
                console.error(err);
              } finally {
                mutateReactions();
              }
            }}
          />,
          document.body,
        )}

      {/* Minigame modals */}

      {pendingGameType && directOpponent && (
        <GameInfoModal
          isOpen={!!pendingGameType && !pendingGameHistoryOpen}
          onClose={() => setPendingGameType(null)}
          gameType={pendingGameType}
          currentUserId={session?.user?.id ?? ""}
          opponentId={directOpponent.user.id}
          opponentUsername={directOpponent.user.username ?? ""}
          conversationId={chatId ?? ""}
          onCreated={(game) => {
            setPendingGameType(null);
            if (game.mode === "LIVE") {
              setGamePlayModal(game);
            }
            mutateGames();
            mutate();
          }}
          onOpenHistory={() => {
            setPendingGameHistoryOpen(true);
          }}
        />
      )}

      {pendingGameHistoryOpen && directOpponent && (
        <GameHistoryModal
          isOpen={pendingGameHistoryOpen}
          onClose={() => setPendingGameHistoryOpen(false)}
          opponentId={directOpponent.user.id}
          opponentUsername={directOpponent.user.username ?? ""}
          currentUserId={session?.user?.id ?? ""}
        />
      )}

      {/* Info modal - open only when view === "info" */}
      {gameInfoData && (
        <GameInfoModal
          isOpen={gameInfoData.view === "info"}
          onClose={() => setGameInfoData(null)}
          gameType={gameInfoData.game.type as GameType}
          currentUserId={session?.user?.id ?? ""}
          game={gameInfoData.game}
          opponentId={
            gameInfoData.game.player1Id === session?.user?.id
              ? gameInfoData.game.player2Id
              : gameInfoData.game.player1Id
          }
          opponentUsername={
            (gameInfoData.game.player1Id === session?.user?.id
              ? gameInfoData.game.player2
              : gameInfoData.game.player1
            ).username ?? ""
          }
          conversationId={chatId ?? ""}
          onOpenPlay={(game) => {
            setGameInfoData(null);
            setGamePlayModal(game);
          }}
          onOpenHistory={() =>
            setGameInfoData((prev) =>
              prev ? { ...prev, view: "history" } : null,
            )
          }
          onAccepted={(acceptedGame) => {
            setGameInfoData(null);
            if (
              acceptedGame.mode === "ASYNC" &&
              acceptedGame.currentTurnId === session?.user?.id
            ) {
              setGamePlayModal(acceptedGame);
            }
            mutateGames();
            mutate();
          }}
          onDeclined={() => {
            setGameInfoData(null);
            mutateGames();
            mutate();
          }}
          onCancelled={() => {
            setGameInfoData(null);
            mutateGames();
            mutate();
          }}
        />
      )}

      {/* History modal - open only when view === "history"; onClose returns to info */}
      {gameInfoData && (
        <GameHistoryModal
          isOpen={gameInfoData.view === "history"}
          onClose={() =>
            setGameInfoData((prev) => (prev ? { ...prev, view: "info" } : null))
          }
          opponentId={
            gameInfoData.game.player1Id === session?.user?.id
              ? gameInfoData.game.player2Id
              : gameInfoData.game.player1Id
          }
          opponentUsername={
            (gameInfoData.game.player1Id === session?.user?.id
              ? gameInfoData.game.player2
              : gameInfoData.game.player1
            ).username ?? ""
          }
          currentUserId={session?.user?.id ?? ""}
        />
      )}

      {/* Play modal */}
      {gamePlayModal && (
        <GamePlayModal
          isOpen={!!gamePlayModal}
          onClose={() => setGamePlayModal(null)}
          initialGame={gamePlayModal}
          onMoveComplete={() => {
            mutateGames();
            mutate();
          }}
        />
      )}
    </div>
  );
}
