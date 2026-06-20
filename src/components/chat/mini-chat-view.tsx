// src/components/chat/mini-chat-view.tsx
"use client";

import { Smiley } from "@/app/(components)/smiley";
import { GameHistoryModal } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-history-modal";
import { GameInfoModal } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-info-modal";
import { GamePlayModal } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-play-modal";
import { GameSystemMessage } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-system-message";
import { MutedInfoModal } from "@/components/moderation/muted-info-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  ChatAvatar,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ReactionAdjustModal } from "@/components/ui/reaction-adjust-modal";
import { ReactionMenu } from "@/components/ui/reaction-menu";
import { ReactionModal } from "@/components/ui/reaction-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
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
  GameType,
  MiniChatViewProps,
  ReactionUser,
  UIMessage,
} from "@/types/app-types";
import {
  Circle,
  Copy,
  Dices,
  EyeOff,
  Flag,
  Gamepad2,
  Ghost,
  Hash,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  Reply,
  Send,
  Smile,
  Sticker,
  User,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { VerifiedBadge } from "../ui/verified-badge";

// How many messages to show per page. The initial render shows the last
// PAGE_SIZE messages; scrolling to the top loads the previous batch.
const PAGE_SIZE = 30;

interface PendingMessage {
  id: string;
  content: string;
  replyToId?: string;
  isAnonymous: boolean;
  timestamp: Date;
}

// Returns the Radix ScrollArea viewport element so we can read/write scrollTop.
function getViewport(scrollAreaEl: HTMLDivElement | null) {
  return (
    scrollAreaEl?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    ) ?? null
  );
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

export function MiniChatView({ chatId, onBack }: MiniChatViewProps) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
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

  const otherParticipants =
    conversation?.participants?.filter(
      (p: ApiConversation["participants"][number]) =>
        p.user.id !== session?.user?.id,
    ) || [];
  const isCommunityChat = !!conversation?.isCommunity;
  const isGroup = isCommunityChat || otherParticipants.length > 1;
  const isJoinedCommunityChat = isCommunityChat
    ? (conversation?.participants?.some(
        (p) => p.user.id === session?.user?.id,
      ) ?? false)
    : true;
  const chatName = getChatDisplayName({
    name: conversation?.name,
    participants: otherParticipants,
  });

  const myMuteInfo = isCommunityChat
    ? (conversation?.community?.mutes?.find(
        (m) => m.userId === session?.user?.id,
      ) ?? null)
    : null;
  const amIMuted =
    !!myMuteInfo &&
    (!myMuteInfo.expiresAt || new Date(myMuteInfo.expiresAt) > new Date());

  const [showMutedModal, setShowMutedModal] = useState(false);

  // Minigame state (direct chats only)
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

  const directOpponent =
    !isGroup && !isCommunityChat ? (otherParticipants[0] ?? null) : null;

  // SWR Polling
  const { data: msgData, mutate } = useMessages(chatId);

  // Optimistic UI state queue
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const activeChatIdRef = useRef<string | undefined>(chatId);

  useEffect(() => {
    activeChatIdRef.current = chatId;
  }, [chatId]);

  // Map API data to UI format
  const allMessages: UIMessage[] = useMemo(() => {
    const messages: ApiMessage[] = msgData?.messages || [];

    return messages.map((m) => {
      // Group reactions
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

      // Resolve reply text
      let replyText = undefined;
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

      const isAnonymousSender = m.sender.id === "anonymous";

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

  const toggleGhost = (id: string) => {
    setRevealedGhosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Captured right before expanding visibleCount to restore the
  // viewport's relative scroll position after React re-renders with more rows.
  const prevScrollHeightRef = useRef<number | null>(null);
  const hasMore = visibleCount < displayMessages.length;

  const visibleMessages = useMemo(
    () =>
      displayMessages.slice(-Math.min(visibleCount, displayMessages.length)),
    [visibleCount, displayMessages],
  );

  // Re-group only the visible slice for rendering.
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

  // -- Refs -------------------------------------------------------------------
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputEmojiButtonRef = useRef<HTMLButtonElement>(null);
  const inputEmojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const moreButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const menuPositionRef = useRef<{
    top: number;
    left: number;
    right?: number;
  } | null>(null);
  const inputEmojiPickerPositionRef = useRef<{
    bottom: number;
    right: number;
  } | null>(null);

  // -- UI state ---------------------------------------------------------------
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(
    null,
  );
  const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<UIMessage | null>(null);
  const [lastReplyingTo, setLastReplyingTo] = useState<UIMessage | null>(null);
  const displayReplyingTo = replyingTo ?? lastReplyingTo;

  const [inputText, setInputText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  // Recalculate textarea height whenever inputText changes (e.g. emoji insertions)
  useEffect(() => {
    const target = textareaRef.current;
    if (!target) return;
    target.style.overflowY = "hidden";
    target.style.height = "auto";
    const scrollH = target.scrollHeight;
    target.style.height = `${Math.min(scrollH, 128)}px`;
    target.style.overflowY = scrollH > 128 ? "auto" : "hidden";
  }, [inputText]);

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
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    right?: number;
  } | null>(null);
  const [showReactionAdjustModal, setShowReactionAdjustModal] = useState(false);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [isEmojiButtonHovered, setIsEmojiButtonHovered] = useState(false);
  const [isEmojiButtonHighlighted, setIsEmojiButtonHighlighted] =
    useState(false);
  const [showEmojiPickerForMessage, setShowEmojiPickerForMessage] = useState<
    string | null
  >(null);
  const [emojiPickerPlacement, setEmojiPickerPlacement] = useState<
    "above" | "below"
  >("above");
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(
    null,
  );
  const [requestActionLoading, setRequestActionLoading] = useState<
    "ACCEPT" | "DECLINE" | null
  >(null);

  const activeModalMessage = useMemo(
    () => displayMessages.find((m) => m.id === activeReactionMsgId),
    [displayMessages, activeReactionMsgId],
  );

  // Auto-close modal if reactions become empty (e.g., after removing the only reaction)
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

  const [inputEmojiPickerPosition, setInputEmojiPickerPosition] = useState<{
    bottom: number;
    right: number;
  } | null>(null);

  // Closing animation states + frozen positions
  const [reactionMenuClosing, setReactionMenuClosing] = useState(false);
  const [emojiPickerClosing, setEmojiPickerClosing] = useState(false);
  const [inputEmojiPickerClosing, setInputEmojiPickerClosing] = useState(false);
  const [reactionMenuClosingPosition, setReactionMenuClosingPosition] =
    useState<typeof menuPosition>(null);
  const [emojiPickerClosingPosition, setEmojiPickerClosingPosition] =
    useState<typeof menuPosition>(null);
  const [inputEmojiPickerClosingPosition, setInputEmojiPickerClosingPosition] =
    useState<typeof inputEmojiPickerPosition>(null);

  const isMobile = useIsMobile();

  // Scroll to bottom when messages change initially or when sending
  useEffect(() => {
    const viewport = getViewport(scrollAreaRef.current);
    if (viewport && visibleMessages.length > 0 && !isLoadingMore) {
      viewport.scrollTop = viewport.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMessages.length]); // Intentionally binding to length to fire on new message

  useEffect(() => {
    menuPositionRef.current = menuPosition;
  }, [menuPosition]);
  useEffect(() => {
    inputEmojiPickerPositionRef.current = inputEmojiPickerPosition;
  }, [inputEmojiPickerPosition]);

  // -- Restore scroll position after loading more messages above --------------
  // Runs after React commits the new rows to the DOM.
  useEffect(() => {
    if (prevScrollHeightRef.current === null) return;
    const viewport = getViewport(scrollAreaRef.current);
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight - prevScrollHeightRef.current;
    }
    prevScrollHeightRef.current = null;
  }, [visibleCount]);

  // -- Load more when scrolled near the top ----------------------------------
  const handleScroll = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const viewport = getViewport(scrollAreaRef.current);
    if (!viewport || viewport.scrollTop > 80) return;

    // Snapshot scrollHeight before state update expands the list.
    prevScrollHeightRef.current = viewport.scrollHeight;
    setIsLoadingMore(true);

    // Brief simulated fetch delay so the spinner is actually visible.
    setTimeout(() => {
      setVisibleCount((prev) =>
        Math.min(prev + PAGE_SIZE, displayMessages.length),
      );
      setIsLoadingMore(false);
    }, 350);
  }, [hasMore, isLoadingMore, displayMessages.length]);

  // Attach scroll listener directly to the Radix viewport element.
  useEffect(() => {
    const viewport = getViewport(scrollAreaRef.current);
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // -- Close helpers ----------------------------------------------------------
  const closeReactionMenu = useCallback(
    (frozenPosition?: typeof menuPosition) => {
      setReactionMenuClosingPosition(frozenPosition ?? menuPositionRef.current);
      setReactionMenuClosing(true);
      setTimeout(() => {
        setActiveReactionMenu(null);
        setReactionMenuClosing(false);
      }, 150);
    },
    [],
  );

  const closeEmojiPicker = useCallback(
    (frozenPosition?: typeof menuPosition) => {
      setEmojiPickerClosingPosition(frozenPosition ?? menuPositionRef.current);
      setEmojiPickerClosing(true);
      setTimeout(() => {
        setShowEmojiPickerForMessage(null);
        setEmojiPickerClosing(false);
      }, 150);
    },
    [],
  );

  const closeInputEmojiPicker = useCallback(
    (frozenPosition?: typeof inputEmojiPickerPosition) => {
      setInputEmojiPickerClosingPosition(
        frozenPosition ?? inputEmojiPickerPositionRef.current,
      );
      setInputEmojiPickerClosing(true);
      setTimeout(() => {
        setShowInputEmojiPicker(false);
        setInputEmojiPickerClosing(false);
        requestAnimationFrame(() => {
          if (inputEmojiButtonRef.current?.matches(":hover")) {
            setIsEmojiButtonHovered(true);
          } else {
            setIsEmojiButtonHighlighted(false);
          }
        });
      }, 150);
    },
    [],
  );

  // -- Click-outside handler --------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(target))
        closeReactionMenu();
      const clickedAMoreButton = Array.from(
        moreButtonRefs.current.values(),
      ).some((btn) => btn.contains(target));
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target) &&
        !clickedAMoreButton
      )
        setActiveMoreMenu(null);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target))
        closeEmojiPicker();
      if (
        inputEmojiButtonRef.current &&
        !inputEmojiButtonRef.current.contains(target) &&
        inputEmojiPickerRef.current &&
        !inputEmojiPickerRef.current.contains(target)
      )
        closeInputEmojiPicker();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeReactionMenu, closeEmojiPicker, closeInputEmojiPicker]);

  // -- Formatters -------------------------------------------------------------
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

  const formatMessageTime = (date: Date) =>
    date.toLocaleString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // -- Handlers ---------------------------------------------------------------
  const handleReply = (message: UIMessage) => {
    setReplyingTo(message);
    setLastReplyingTo(message);
  };

  const cancelReply = () => setReplyingTo(null);

  const handleEmojiSelectForInput = (emoji: string) => {
    if (!textareaRef.current) {
      setInputText((prev) => prev + emoji);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setInputText((prev) => {
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      return before + emoji + after;
    });
    // After state update, set caret after emoji
    setTimeout(() => {
      textarea.focus();
      const caret = start + emoji.length;
      textarea.setSelectionRange(caret, caret);
    }, 0);
  };

  const handleEmojiSelectForMessage = async (msgId: string, emoji: string) => {
    // Instantly hide the menus for better perceived performance
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
      console.error("Network error toggling reaction", err);
    }
  };

  const handleRequestAction = async (action: "ACCEPT" | "DECLINE") => {
    if (requestActionLoading) return;
    setRequestActionLoading(action);
    try {
      const res = await fetch(`/api/conversations/${chatId}/participant`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to update request status");

      await Promise.all([mutateConversations(), mutate()]);
      if (action === "DECLINE") onBack?.(); // <-- forskellen
    } catch (err) {
      console.error("Failed to handle message request action", err);
    } finally {
      setRequestActionLoading(null);
    }
  };

  const sendWithRetry = async (
    payload: { content: string; replyToId?: string; isAnonymous?: boolean },
    tempId: string,
    retryCount = 0,
  ) => {
    try {
      const resolvedChatId = activeChatIdRef.current;
      if (!resolvedChatId) throw new Error("No active chat ID to send to");

      const res = await fetch(`/api/conversations/${resolvedChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
      setShowOfflineWarning(false);
      mutate();
    } catch (err) {
      console.error("Message send failed, retrying in 3s...", err);
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
    "flex items-center w-full px-4 py-3 text-sm font-medium text-foreground-60 hover:text-foreground hover:bg-foreground/5 focus:bg-foreground/5 transition-colors cursor-pointer rounded-none group/item";

  // -- Render -----------------------------------------------------------------
  return (
    <div className="flex h-full flex-col bg-background relative">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="flex flex-col gap-0 px-4 pt-4 pb-2 overflow-x-hidden">
          {/* Spinner - visible while fetching the previous batch */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-4 w-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>
          )}

          {/* Subtle hint when older messages exist but aren't loading yet */}
          {hasMore && !isLoadingMore && (
            <div className="flex justify-center py-3">
              <span className="text-xs text-foreground-40 font-medium">
                {t("MessagesPage.scroll_up_for_older_messages")}
              </span>
            </div>
          )}

          <div className="flex flex-col items-center py-8 gap-3">
            <ChatAvatar
              participants={
                isCommunityChat
                  ? []
                  : isGroup
                    ? (conversation?.participants ?? otherParticipants)
                    : otherParticipants
              }
              chatImage={conversation?.image}
              className="h-18 w-18"
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
            <div className="text-center">
              <div className="font-bold font-heading text-base text-foreground px-4 flex items-center justify-center gap-1.5">
                {chatName}
                {!isGroup &&
                  !isCommunityChat &&
                  otherParticipants.length === 1 &&
                  otherParticipants[0].user.emailVerified && (
                    <VerifiedBadge className="h-4 w-4" />
                  )}
              </div>
              {isCommunityChat ? (
                <div className="text-xs font-medium text-foreground-60">
                  {t("MessagesPage.community_chat_badge")}
                </div>
              ) : !isGroup ? (
                <div className="text-xs font-medium text-foreground-60">
                  u/{otherParticipants[0]?.user.username || "..."}
                </div>
              ) : null}
            </div>
            {!isGroup && otherParticipants[0] && (
              <Link
                href={`/${locale}/u/${otherParticipants[0].user.username}`}
                className="flex items-center gap-1.5 mt-1 px-3.5 py-1.5 rounded-full border border-surface-border bg-surface text-xs font-medium text-foreground-60 hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                {t("MessagesPage.view_profile")}
              </Link>
            )}
          </div>

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
                  if (msg.minigameId) {
                    const linkedGame =
                      activeGames.find((g) => g.id === msg.minigameId) ?? null;
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
                const isPendingMsg = msg.id.startsWith("temp-");

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

                const timeSinceLastMessage = prevMsg
                  ? (msg.timestamp.getTime() - prevMsg.timestamp.getTime()) /
                    (1000 * 60)
                  : 0;
                const shouldAddSpacing = timeSinceLastMessage > 5;

                let marginBottom = isLastInGroup ? "0.75rem" : "0.3rem";
                if (nextMsg && msg.sender !== nextMsg.sender)
                  marginBottom = "1rem";
                if (!msg.isDeleted && msg.reactions && msg.reactions.length > 0)
                  marginBottom = `${parseFloat(marginBottom) + (isMostRecentVisibleMessage ? 0.45 : 1.35)}rem`;
                if (isNoteReaction)
                  marginBottom = `${parseFloat(marginBottom) + 1.0}rem`;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full group",
                      isMe ? "justify-end" : "justify-start",
                      shouldAddSpacing && "mt-4",
                    )}
                    style={{ marginBottom }}
                  >
                    <div className="flex max-w-[75%] min-w-0 items-end gap-2">
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
                                            "--tw-ring-color": getMoodRingColor(
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
                                            "--tw-ring-color": getMoodRingColor(
                                              msg.senderDailyStatusValue,
                                            ),
                                          } as React.CSSProperties
                                        }
                                      >
                                        {msg.senderImage && (
                                          <AvatarImage src={msg.senderImage} />
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
                                        DAILY_STATUSES[msg.replyToStatus.value]
                                          .labelKey,
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
                                  {t("MessagesPage.replying_to").replace(
                                    "{{user}}",
                                    msg.senderName,
                                  )}
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
                                  {t("MessagesPage.replied_to_you").replace(
                                    "{{user}}",
                                    msg.senderName,
                                  )}
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
                            isPendingMsg && "opacity-60",
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
                                  className="relative p-3 rounded-2xl max-w-[240px] flex flex-col gap-1.5 shadow-sm border border-white/10"
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
                                        DAILY_STATUSES[msg.replyToStatus!.value]
                                          .labelKey,
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
                                  "inline-block px-4 py-2.5 text-sm whitespace-pre-wrap font-medium max-w-full break-all [overflow-wrap:anywhere]",
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

                          {/* Hover Menu */}
                          {!msg.isDeleted &&
                            !isPendingMsg &&
                            ((isCommunityChat && isJoinedCommunityChat) ||
                              !isCommunityChat) && (
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 flex items-center transition-opacity z-50",
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
                                <Tooltip
                                  content={t("FloatingChat.react_tooltip")}
                                  side="top"
                                >
                                  <div
                                    className="group/btn flex items-center justify-center w-[26px] h-[26px] rounded-full cursor-pointer hover:bg-foreground/5 hover:scale-110 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setMenuPosition({
                                        top: rect.top,
                                        left: rect.left,
                                        right: window.innerWidth - rect.right,
                                      });
                                      setActiveReactionMenu(
                                        activeReactionMenu === msg.id
                                          ? null
                                          : msg.id,
                                      );
                                    }}
                                  >
                                    <Smile className="h-[14px] w-[14px] text-foreground-40 group-hover/btn:text-foreground transition-colors" />{" "}
                                  </div>
                                </Tooltip>

                                <Tooltip
                                  content={t("FloatingChat.reply_tooltip")}
                                  side="top"
                                >
                                  <div
                                    className="group/btn flex items-center justify-center w-[26px] h-[26px] rounded-full cursor-pointer hover:bg-foreground/5 hover:scale-110 transition-all"
                                    onClick={() => handleReply(msg)}
                                  >
                                    <Reply className="h-[14px] w-[14px] text-foreground-40 group-hover/btn:text-foreground transition-colors" />{" "}
                                  </div>
                                </Tooltip>

                                <Tooltip
                                  content={t("FloatingChat.more_tooltip")}
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
                                    className="group/btn flex items-center justify-center w-[26px] h-[26px] rounded-full relative cursor-pointer hover:bg-foreground/5 hover:scale-110 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setMenuPosition({
                                        top: rect.top,
                                        left: rect.left,
                                        right: window.innerWidth - rect.right,
                                      });
                                      setActiveMoreMenu(
                                        activeMoreMenu === msg.id
                                          ? null
                                          : msg.id,
                                      );
                                    }}
                                  >
                                    <MoreHorizontal className="h-[14px] w-[14px] text-foreground-40 group-hover/btn:text-foreground transition-colors" />{" "}
                                  </div>
                                </Tooltip>
                              </div>
                            )}

                          {/* Reaction pill */}
                          {!msg.isDeleted &&
                            !isPendingMsg &&
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
        </div>
      </ScrollArea>
      {/* Footer / Input Area */}
      {isCommunityChat && !isJoinedCommunityChat ? (
        <div className="flex flex-col gap-3 bg-surface border-t border-surface-border p-4 z-20">
          <p className="text-xs text-foreground-60 text-center">
            {t("MessagesPage.join_community_chat_description")}
          </p>
          <Button
            onClick={async () => {
              if (!chatId) return;
              try {
                await fetch(`/api/conversations/${chatId}/join`, {
                  method: "POST",
                });
                await Promise.all([mutateConversations(), mutate()]);
              } catch (err) {
                console.error("[MiniChatView] join error:", err);
              }
            }}
            className="w-full cursor-pointer"
          >
            {t("MessagesPage.join_community_chat")}
          </Button>
        </div>
      ) : msgData?.conversation?.isMuted ? (
        <div className="flex items-center justify-center bg-surface border-t border-surface-border px-4 py-5 z-20">
          <p className="text-sm font-medium text-foreground-40 text-center">
            {t("MessagesPage.muted_cannot_send")}
          </p>
        </div>
      ) : isPending ? (
        <div className="flex flex-col gap-3 bg-surface border-t border-surface-border p-4 z-20">
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
        <div className="flex flex-col bg-surface border-t border-surface-border p-2 z-20 relative">
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

          <div
            className="reply-preview mx-2"
            data-open={replyingTo ? "true" : "false"}
          >
            <div>
              <div className="flex items-center justify-between bg-background rounded-xl px-4 py-2.5 border border-surface-border">
                <div className="flex flex-col overflow-hidden">
                  <div className="text-xs font-bold text-brand uppercase tracking-wider">
                    {t("MessagesPage.replying_to").replace(
                      "{{user}}",
                      displayReplyingTo?.sender === "me"
                        ? t("MessagesPage.yourself")
                        : displayReplyingTo?.senderName || "Unknown",
                    )}
                  </div>
                  <div className="text-sm font-medium text-foreground-60 mt-0.5 truncate max-w-xs">
                    {displayReplyingTo?.text}
                  </div>
                </div>
                <button
                  onClick={cancelReply}
                  className="ml-4 flex-shrink-0 text-foreground-40 hover:text-foreground cursor-pointer transition-transform hover:scale-110 bg-surface p-1 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2">
            {/* Anonymity toggle - community chats only */}
            {isCommunityChat && isJoinedCommunityChat && (
              <button
                type="button"
                onClick={() => setIsAnonymous((v) => !v)}
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors cursor-pointer flex-shrink-0 w-8 h-8",
                  isAnonymous
                    ? "bg-brand/20 text-brand"
                    : "text-foreground-40 hover:text-foreground hover:bg-foreground/5",
                )}
              >
                <EyeOff className="h-4 w-4" />
              </button>
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
                          "flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer focus:outline-none flex-shrink-0",
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
                    // z-[200] renders above the floating chat container (z-[90])
                    className="w-52 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0 z-[200]"
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
                      const isBlocked = activeGames.some(
                        (g) => g.type === type,
                      );
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
                          {isBlocked && (
                            <span className="ml-auto text-[10px] text-foreground-40 font-normal">
                              {t("minigames.game_already_active")}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            <div className="flex-1 flex items-center gap-2 rounded-3xl border border-surface-border bg-background px-3 py-1.5 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all min-h-[44px]">
              <Tooltip content={t("FloatingChat.emoji_picker")} side="top">
                <button
                  ref={inputEmojiButtonRef}
                  aria-label={t("FloatingChat.emoji_picker")}
                  className="flex items-center justify-center cursor-pointer"
                  onMouseEnter={() => setIsEmojiButtonHovered(true)}
                  onMouseLeave={() => setIsEmojiButtonHovered(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setInputEmojiPickerPosition({
                      bottom: window.innerHeight - rect.top + 10,
                      right: window.innerWidth - rect.right,
                    });
                    if (showInputEmojiPicker) closeInputEmojiPicker();
                    else {
                      setShowInputEmojiPicker(true);
                      setIsEmojiButtonHighlighted(true);
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }
                  }}
                >
                  <Smile
                    className={cn(
                      "h-[22px] w-[22px] transition-colors",
                      isEmojiButtonHighlighted || isEmojiButtonHovered
                        ? "text-foreground"
                        : "text-foreground-60",
                    )}
                  />
                </button>
              </Tooltip>

              <textarea
                value={inputText}
                maxLength={1000}
                ref={textareaRef}
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
                placeholder={t("MessagesPage.message_placeholder")}
                className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-foreground-40 text-foreground resize-none min-h-[28px] break-words whitespace-pre-wrap"
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

              <div
                className={cn(
                  "relative flex-shrink-0 text-foreground-40",
                  !!inputText.trim() ? "w-8" : "",
                )}
              >
                <div
                  className={cn(
                    "flex items-center h-8 gap-2.5 mr-1 transition-all duration-200 ease-in-out",
                    !!inputText.trim()
                      ? "translate-x-3 opacity-0 pointer-events-none w-0 overflow-hidden mr-0"
                      : "w-auto",
                  )}
                >
                  <Tooltip content={t("FloatingChat.voice_note")} side="top">
                    <button
                      type="button"
                      aria-label={t("FloatingChat.voice_note")}
                      className="flex items-center justify-center cursor-pointer"
                    >
                      <Mic className="h-[22px] w-[22px] hover:text-foreground transition-colors" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("FloatingChat.image_upload")} side="top">
                    <button
                      type="button"
                      aria-label={t("FloatingChat.image_upload")}
                      className="flex items-center justify-center cursor-pointer"
                    >
                      <ImageIcon className="h-[22px] w-[22px] hover:text-foreground transition-colors" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("FloatingChat.gif_picker")} side="top">
                    <button
                      type="button"
                      aria-label={t("FloatingChat.gif_picker")}
                      className="flex items-center justify-center cursor-pointer"
                    >
                      <Sticker className="h-[22px] w-[22px] hover:text-foreground transition-colors" />
                    </button>
                  </Tooltip>
                </div>

                <Tooltip content={t("FloatingChat.send")} side="top">
                  <button
                    onClick={handleSend}
                    aria-label={t("FloatingChat.send")}
                    className={cn(
                      "absolute -right-1 top-1/2 -translate-y-1/2",
                      "flex items-center justify-center h-8 w-8 rounded-full bg-brand text-white cursor-pointer",
                      "transition-all duration-200 ease-in-out",
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
      {/* -- Portals ----------------------------------------------------------- */}
      {typeof window !== "undefined" &&
        createPortal(
          <ReactionModal
            isOpen={
              !!activeReactionMsgId && !!activeModalMessage?.reactions?.length
            }
            onClose={() => setActiveReactionMsgId(null)}
            reactions={activeModalMessage?.reactions || []}
            onRemove={(emoji) => {
              if (activeReactionMsgId) {
                handleEmojiSelectForMessage(activeReactionMsgId, emoji);
              }
            }}
          />,
          document.body,
        )}
      {typeof window !== "undefined" &&
        (activeReactionMenu !== null || reactionMenuClosing) &&
        menuPosition &&
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
              top: `${(reactionMenuClosing ? reactionMenuClosingPosition : menuPosition)!.top - 70}px`,
              left: isMobile ? "50%" : "auto",
              right: isMobile
                ? "auto"
                : `${window.innerWidth - (reactionMenuClosing ? reactionMenuClosingPosition : menuPosition)!.left + 10}px`,
              transform: isMobile ? "translateX(-50%)" : "none",
              zIndex: 9999,
              maxWidth: "95vw",
            }}
            reactions={defaultReactions}
            onReactionSelect={(emoji) =>
              handleEmojiSelectForMessage(activeReactionMenu ?? "", emoji)
            }
            onPlusClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const buttonY = rect.top + rect.height / 2;
              const pickerHeight = 430;
              setEmojiPickerPlacement(
                window.innerHeight - buttonY >= pickerHeight
                  ? "below"
                  : buttonY >= pickerHeight
                    ? "above"
                    : "below",
              );
              setMenuPosition({
                top: rect.top,
                left: rect.left,
                right: window.innerWidth - rect.right,
              });
              setShowEmojiPickerForMessage(activeReactionMenu);
              closeReactionMenu(menuPosition);
            }}
          />,
          document.body,
        )}
      {typeof window !== "undefined" &&
        (showEmojiPickerForMessage !== null || emojiPickerClosing) &&
        (menuPosition || emojiPickerClosingPosition) &&
        createPortal(
          <div
            ref={emojiPickerRef}
            className={cn(
              "fixed",
              emojiPickerClosing
                ? "animate-emoji-picker-out"
                : "animate-emoji-picker-in",
            )}
            style={{
              top: isMobile
                ? "25%"
                : emojiPickerPlacement === "below"
                  ? `${(emojiPickerClosing ? emojiPickerClosingPosition : menuPosition)!.top + 10}px`
                  : `${(emojiPickerClosing ? emojiPickerClosingPosition : menuPosition)!.top - 430}px`,
              left: isMobile ? "50%" : "auto",
              right: isMobile
                ? "auto"
                : `${(emojiPickerClosing ? emojiPickerClosingPosition : menuPosition)!.right}px`,
              transform: isMobile ? "translateX(-50%)" : "none",
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
          </div>,
          document.body,
        )}
      {typeof window !== "undefined" &&
        (showInputEmojiPicker || inputEmojiPickerClosing) &&
        (inputEmojiPickerPosition || inputEmojiPickerClosingPosition) &&
        createPortal(
          <div
            ref={inputEmojiPickerRef}
            className={cn(
              "fixed",
              inputEmojiPickerClosing
                ? "animate-emoji-picker-out"
                : "animate-emoji-picker-in",
            )}
            style={{
              bottom: isMobile
                ? "auto"
                : `${(inputEmojiPickerClosing ? inputEmojiPickerClosingPosition : inputEmojiPickerPosition)!.bottom}px`,
              top: isMobile ? "20%" : "auto",
              right: isMobile
                ? "auto"
                : `${(inputEmojiPickerClosing ? inputEmojiPickerClosingPosition : inputEmojiPickerPosition)!.right}px`,
              left: isMobile ? "50%" : "auto",
              transform: isMobile ? "translateX(-50%)" : "none",
              zIndex: 9999,
              maxWidth: "95vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EmojiPicker
              onEmojiSelect={handleEmojiSelectForInput}
              mode="input"
            />
          </div>,
          document.body,
        )}
      {typeof window !== "undefined" &&
        activeMoreMenu !== null &&
        menuPosition &&
        createPortal(
          <div
            ref={moreMenuRef}
            className="fixed bg-surface-opaque backdrop-blur-md rounded-xl shadow-xl border border-surface-border min-w-[200px] overflow-hidden cursor-default z-[100] animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: `${menuPosition.top - 110}px`,
              left: isMobile ? "50%" : "auto",
              right: isMobile
                ? "auto"
                : `${window.innerWidth - menuPosition.left + 10}px`,
              transform: isMobile ? "translateX(-50%)" : "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border flex flex-col gap-0.5">
              <span>
                {formatMessageTime(
                  allMessages.find((m) => m.id === activeMoreMenu)?.timestamp ||
                    new Date(),
                )}
              </span>
              {(() => {
                const msg = allMessages.find((m) => m.id === activeMoreMenu);
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
                  const msg = allMessages.find((m) => m.id === activeMoreMenu);
                  if (msg) navigator.clipboard.writeText(msg.text);
                  setActiveMoreMenu(null);
                }}
              >
                <Copy className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110" />
                <span>{t("MessagesPage.copy_message")}</span>
              </div>
              <div className="border-t border-surface-border" />
              <div
                className={cn(menuItemCls, "text-brand hover:text-brand")}
                onClick={() => setActiveMoreMenu(null)}
              >
                <Flag className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110" />
                <span>{t("MessagesPage.report_message")}</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {typeof window !== "undefined" &&
        createPortal(
          <ReactionAdjustModal
            isOpen={showReactionAdjustModal}
            onClose={() => setShowReactionAdjustModal(false)}
            currentReactions={defaultReactions}
            onReactionsUpdate={async (newReactions) => {
              // Optimistic UI update: instantly show new emojis without waiting for DB
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
                // Revalidate with server truth
                mutateReactions();
              }
            }}
          />,
          document.body,
        )}

      {/* Muted Info Modal */}
      {typeof window !== "undefined" &&
        createPortal(
          <MutedInfoModal
            isOpen={showMutedModal}
            onClose={() => setShowMutedModal(false)}
            reason={myMuteInfo?.reason ?? null}
            mutedUntil={myMuteInfo?.expiresAt ?? null}
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

      {/* History modal opened directly from the create-game flow */}
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
