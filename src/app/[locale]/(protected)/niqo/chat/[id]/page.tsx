// src/app/[locale]/(protected)/niqo/chat/[id]/page.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { useDailyStatus } from "@/context/daily-status-context";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { ApiNiqoMessage } from "@/types/app-types";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TYPING_SPEED_MS = 10;

function getViewport(el: HTMLDivElement | null) {
  return (
    el?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]") ??
    null
  );
}

export default function NiqoChatPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const { data: session } = useSession();

  const { currentValue } = useDailyStatus();
  const moodColor = getMoodRingColor(currentValue);
  const botRingColor = currentValue !== null ? moodColor : "var(--brand)";

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<ApiNiqoMessage[]>([]);

  // Keyed by real message ID - only populated for messages sent in this session
  // where PII was detected. Never persisted; lives in client memory only.
  const [originalContentMap, setOriginalContentMap] = useState<
    Record<string, string>
  >({});
  // Tracks which messages are currently showing their original (pre-filter) text
  const [showOriginalSet, setShowOriginalSet] = useState<Set<string>>(
    new Set(),
  );

  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animatingText, setAnimatingText] = useState("");
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasTriggeredGenerateRef = useRef(false);
  const isInitializedRef = useRef(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: fetchedMessages } = useSWR<ApiNiqoMessage[]>(
    `/api/niqo/${chatId}/messages`,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!fetchedMessages || isInitializedRef.current) return;
    isInitializedRef.current = true;
    setLocalMessages(fetchedMessages);

    // Restore original content from landing page if it exists and differs from filtered version
    const storedOriginal = sessionStorage.getItem(`niqo-original-${chatId}`);
    if (storedOriginal) {
      const firstUserMsg = fetchedMessages.find((m) => m.role === "USER");
      if (firstUserMsg && firstUserMsg.content !== storedOriginal) {
        setOriginalContentMap((prev) => ({
          ...prev,
          [firstUserMsg.id]: storedOriginal,
        }));
      }
      sessionStorage.removeItem(`niqo-original-${chatId}`);
    }
  }, [fetchedMessages, chatId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const viewport = getViewport(scrollAreaRef.current);
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [localMessages, scrollToBottom]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (animatingId) {
        scrollToBottom("auto");
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [animatingId, scrollToBottom]);

  const startTypingAnimation = useCallback((msg: ApiNiqoMessage) => {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);

    setAnimatingId(msg.id);
    setAnimatingText("");

    let idx = 0;
    animIntervalRef.current = setInterval(() => {
      idx++;
      setAnimatingText(msg.content.slice(0, idx));
      if (idx >= msg.content.length) {
        clearInterval(animIntervalRef.current!);
        animIntervalRef.current = null;
        setAnimatingId(null);
        setIsSending(false);
      }
    }, TYPING_SPEED_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      !isInitializedRef.current ||
      localMessages.length === 0 ||
      hasTriggeredGenerateRef.current
    )
      return;

    const lastMsg = localMessages[localMessages.length - 1];
    if (lastMsg?.role !== "USER") return;

    hasTriggeredGenerateRef.current = true;
    setIsSending(true);

    fetch(`/api/niqo/${chatId}/generate`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Generate failed");
        const { content } = (await res.json()) as { content: string };

        setIsSending(false);

        const aiMsg: ApiNiqoMessage = {
          id: "gen-" + Date.now(),
          niqoChatId: chatId,
          role: "MODEL",
          content,
          createdAt: new Date().toISOString(),
        };

        setLocalMessages((prev) => [...prev, aiMsg]);
        startTypingAnimation(aiMsg);
      })
      .catch((err) => {
        console.error("[NiqoChatPage] Generate error:", err);
        setIsSending(false);
      });
  }, [localMessages, chatId, startTypingAnimation]);

  const toggleOriginal = useCallback((id: string) => {
    setShowOriginalSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const currentInput = input;
    setInput("");
    setIsSending(true);

    const optimisticId = "optimistic-" + Date.now();
    setLocalMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        niqoChatId: chatId,
        role: "USER",
        content: currentInput,
        createdAt: new Date().toISOString(),
      },
    ]);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`/api/niqo/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentInput }),
      });

      if (!res.ok) throw new Error("Send failed");

      // FIX: server now returns { userMessage, aiMessage }
      const { userMessage, aiMessage } = (await res.json()) as {
        userMessage: ApiNiqoMessage;
        aiMessage: ApiNiqoMessage;
      };

      // Replace the optimistic entry with the real persisted userMessage.
      // userMessage.content is the filtered version - if it differs from what
      // the user typed, PII was detected. Store the original client-side only;
      // it is never sent to the server, Gemini, or the database.
      setLocalMessages((prev) => [
        ...prev.map((m) => (m.id === optimisticId ? userMessage : m)),
        aiMessage,
      ]);

      if (userMessage.content !== currentInput) {
        setOriginalContentMap((prev) => ({
          ...prev,
          [userMessage.id]: currentInput,
        }));
      }

      startTypingAnimation(aiMessage);
    } catch (error) {
      console.error("[NiqoChatPage] Send error:", error);
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setIsSending(false);
    }
  };

  const showThinking = isSending && !animatingId;
  const inputDisabled = isSending && !animatingId;

  const username = session?.user?.username || session?.user?.name || "?";
  const userAvatarBgColor = session?.user?.avatarBgColor;
  const userAvatarEmoji = session?.user?.avatarEmoji;

  return (
    <TooltipProvider>
      <div className="relative flex flex-col h-full w-full overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-700"
          style={{
            background:
              currentValue !== null
                ? `linear-gradient(to bottom, ${moodColor}55 0%, ${moodColor}15 55%, transparent 100%)`
                : `linear-gradient(to bottom, color-mix(in srgb, var(--brand) 33%, transparent) 0%, color-mix(in srgb, var(--brand) 8%, transparent) 55%, transparent 100%)`,
          }}
        />

        <div className="relative flex flex-col flex-1 h-full max-w-3xl mx-auto w-full min-h-0 animate-post-enter">
          <div className="absolute top-4 left-4 z-20">
            <Tooltip content={t("niqo.back")} side="right">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 cursor-pointer shadow-md bg-surface/80 backdrop-blur-md border-transparent hover:border-surface-border transition-all"
                onClick={() => router.push(`/${locale}/niqo`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>

          <ScrollArea
            ref={scrollAreaRef}
            className="flex-1 h-full w-full min-h-0"
          >
            <div
              ref={contentRef}
              className="flex flex-col p-4 pt-20 space-y-6 pb-2"
            >
              {!isInitializedRef.current && (
                <div className="flex justify-center mt-10">
                  <Loader2 className="w-6 h-6 animate-spin text-foreground-60" />
                </div>
              )}

              {localMessages.length === 0 &&
                isInitializedRef.current &&
                !showThinking && (
                  <div className="flex flex-col items-center justify-center h-full text-foreground-60 gap-4 mt-10">
                    <Sparkles className="w-10 h-10 opacity-50 drop-shadow-sm" />
                    <p>{t("niqo.empty_chat")}</p>
                  </div>
                )}

              {localMessages.map((msg) => {
                const isMe = msg.role === "USER";
                const isAnimating = animatingId === msg.id;

                // PII toggle: only available for messages sent this session
                // where filtering was detected. Never available after reload.
                const hasOriginal = isMe && !!originalContentMap[msg.id];
                const isShowingOriginal = showOriginalSet.has(msg.id);

                const displayContent = isAnimating
                  ? animatingText
                  : isShowingOriginal
                    ? originalContentMap[msg.id]
                    : msg.content;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full group",
                      isMe ? "justify-end" : "justify-start",
                    )}
                  >
                    <div className="flex max-w-[85%] gap-2 items-end">
                      {!isMe && (
                        <div className="w-8 flex-shrink-0">
                          <Tooltip content="Niqo" side="left">
                            <Avatar
                              className="h-8 w-8 bg-surface ring-2 ring-offset-1 ring-offset-background flex items-center justify-center shadow-md border-none"
                              style={
                                {
                                  "--tw-ring-color": botRingColor,
                                } as React.CSSProperties
                              }
                            >
                              <Bot className="h-4 w-4 text-brand" />
                            </Avatar>
                          </Tooltip>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {isMe && hasOriginal && (
                          <Tooltip
                            content={
                              isShowingOriginal
                                ? t("niqo.show_filtered")
                                : t("niqo.show_original")
                            }
                            side="top"
                          >
                            <button
                              onClick={() => toggleOriginal(msg.id)}
                              className={cn(
                                "flex-shrink-0 transition-colors focus:outline-none",
                                !isShowingOriginal
                                  ? "text-brand"
                                  : "text-foreground-40 hover:text-foreground-60",
                              )}
                              aria-label={
                                isShowingOriginal
                                  ? t("niqo.show_filtered")
                                  : t("niqo.show_original")
                              }
                            >
                              <ShieldCheck
                                className="w-6 h-6"
                                strokeWidth={2.5}
                              />
                            </button>
                          </Tooltip>
                        )}

                        <div
                          className={cn(
                            "px-4 py-3 text-sm md:text-base w-fit whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                            isMe
                              ? "bg-brand text-white rounded-2xl rounded-br-[6px]"
                              : "bg-surface text-foreground rounded-2xl rounded-bl-[6px]",
                          )}
                        >
                          {displayContent}
                          {isAnimating && !isMe && (
                            <span className="inline-block w-px h-[1em] bg-foreground-60 ml-0.5 animate-pulse align-middle" />
                          )}
                        </div>
                      </div>

                      {isMe && (
                        <div className="w-8 flex-shrink-0">
                          <Tooltip content={`u/${username}`} side="right">
                            <Avatar
                              className="h-8 w-8 ring-2 ring-offset-1 ring-offset-background shadow-md border-none"
                              style={
                                {
                                  "--tw-ring-color": moodColor,
                                } as React.CSSProperties
                              }
                            >
                              {session?.user?.image ? (
                                <AvatarImage src={session.user.image} />
                              ) : userAvatarBgColor ? (
                                <IconAvatar
                                  emoji={userAvatarEmoji}
                                  bgColor={userAvatarBgColor}
                                  emojiSizeClass="text-base"
                                />
                              ) : (
                                <AvatarFallback className="text-[10px] bg-surface font-bold text-foreground">
                                  {session?.user?.username?.[0]?.toUpperCase() ||
                                    session?.user?.name?.[0]?.toUpperCase() ||
                                    "?"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {showThinking && (
                <div className="flex w-full justify-start animate-in fade-in">
                  <div className="flex max-w-[85%] gap-2 items-end">
                    <div className="w-8 flex-shrink-0">
                      <Tooltip content="Niqo" side="left">
                        <Avatar
                          className="h-8 w-8 bg-surface ring-2 ring-offset-1 ring-offset-background flex items-center justify-center shadow-md border-none"
                          style={
                            {
                              "--tw-ring-color": botRingColor,
                            } as React.CSSProperties
                          }
                        >
                          <Bot className="h-4 w-4 text-brand" />
                        </Avatar>
                      </Tooltip>
                    </div>
                    <div className="px-4 py-3 text-sm md:text-base bg-surface text-foreground rounded-2xl rounded-bl-[6px] flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-brand" />
                      <span className="text-sm">{t("niqo.sending")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 w-full z-10 px-4 pt-2 pb-4">
            <form onSubmit={handleSendMessage} className="w-full">
              <div className="relative flex items-center gap-2 bg-surface shadow-md rounded-3xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand transition-all border border-surface-border/50">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  placeholder=""
                  rows={1}
                  style={
                    {
                      fieldSizing: "content",
                      maxHeight: "216px",
                      overflowY: "auto",
                    } as React.CSSProperties
                  }
                  className="flex-1 bg-transparent text-foreground outline-none resize-none leading-normal placeholder:text-foreground-40"
                  disabled={inputDisabled}
                />
                <Tooltip content={t("niqo.send")} side="top">
                  <button
                    type="submit"
                    disabled={!input.trim() || inputDisabled}
                    className="flex-shrink-0 p-2 bg-brand text-white rounded-full hover:bg-brand-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors self-end shadow-sm"
                  >
                    {inputDisabled ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </Tooltip>
              </div>
            </form>
            <p className="text-center text-xs text-foreground-40 mt-2 px-4">
              {t("niqo.disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
