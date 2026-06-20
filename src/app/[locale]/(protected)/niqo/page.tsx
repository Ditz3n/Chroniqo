// src/app/[locale]/(protected)/niqo/page.tsx
"use client";

import { HeroSmiley } from "@/app/(components)/hero-smiley";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { useDailyStatus } from "@/context/daily-status-context";
import { useTranslation } from "@/lib/hooks/use-translation";
import { NiqoRecentChat } from "@/types/app-types";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { DeleteNiqoChatModal } from "./(components)/delete-niqo-chat-modal";
import { NewNiqoChatModal } from "./(components)/new-niqo-chat-modal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SMILEY_NATURAL_PX = 520;

export default function NiqoLandingPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { currentValue } = useDailyStatus();

  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const createdChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const style = document.createElement("style");
    style.id = "niqo-no-scroll";
    style.textContent =
      "html,body{overflow:hidden!important;scrollbar-width:none!important}" +
      "html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}";
    document.head.appendChild(style);

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      document.getElementById("niqo-no-scroll")?.remove();
    };
  }, []);

  const smileyContainerRef = useRef<HTMLDivElement>(null);
  const [smileyScale, setSmileyScale] = useState(0.5);

  useEffect(() => {
    const container = smileyContainerRef.current;
    if (!container) return;

    const isMobile = () => window.innerWidth < 768;

    const ro = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.height;
      const maxScale = isMobile() ? 0.65 : 1;
      setSmileyScale(Math.min(maxScale, (available - 16) / SMILEY_NATURAL_PX));
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const [twText, setTwText] = useState("");
  const [twCursor, setTwCursor] = useState(false);
  const [twVariantIndex, setTwVariantIndex] = useState(0);
  const [twFading, setTwFading] = useState(false);
  const cancelRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const isLocked = currentValue !== null;

  const { data, isLoading, mutate } = useSWR<NiqoRecentChat>(
    "/api/niqo",
    fetcher,
  );

  useEffect(() => {
    cancelRef.current = false;
    timersRef.current = [];

    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(res, ms);
        timersRef.current.push(id);
      });

    const variantCount = isLocked ? 2 : 5;

    async function runCycle(variantIdx: number) {
      if (cancelRef.current) return;

      const key = isLocked
        ? (`niqo.locked_placeholder_${currentValue}_${variantIdx}` as Parameters<
            typeof t
          >[0])
        : (`niqo.placeholder_${variantIdx}` as Parameters<typeof t>[0]);

      const text = tRef.current(key);

      setTwCursor(true);

      for (let i = 1; i <= text.length; i++) {
        await wait(45);
        if (cancelRef.current) return;
        setTwText(text.slice(0, i));
      }

      for (let b = 0; b < 3; b++) {
        await wait(400);
        if (cancelRef.current) return;
        setTwCursor(false);
        await wait(400);
        if (cancelRef.current) return;
        setTwCursor(true);
      }

      const nextIdx = (variantIdx + 1) % variantCount;
      setTwFading(true);
      await wait(350);
      if (cancelRef.current) return;
      setTwFading(false);
      setTwVariantIndex(nextIdx);

      for (let i = text.length - 1; i >= 0; i--) {
        await wait(25);
        if (cancelRef.current) return;
        setTwText(text.slice(0, i));
      }

      setTwCursor(false);
      await wait(300);
      if (cancelRef.current) return;

      runCycle(nextIdx);
    }

    runCycle(0);

    return () => {
      cancelRef.current = true;
      timersRef.current.forEach(clearTimeout);
      setTwText("");
      setTwCursor(false);
    };
  }, [isLocked, currentValue]);

  const executeStartChat = async () => {
    const res = await fetch("/api/niqo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input }),
    });
    if (!res.ok) throw new Error("Failed to start chat");
    const { conversationId } = await res.json();
    createdChatIdRef.current = conversationId;

    // Save the exact user input to sessionStorage so the chat page can offer the PII shield toggle
    sessionStorage.setItem(`niqo-original-${conversationId}`, input);

    return conversationId as string;
  };

  const handleStartChatDirectly = async () => {
    if (!input.trim()) return;
    setIsSubmitting(true);
    try {
      const conversationId = await executeStartChat();
      router.push(`/${locale}/niqo/chat/${conversationId}`);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    if (data?.conversationId) {
      setShowConfirmModal(true);
    } else {
      handleStartChatDirectly();
    }
  };

  const handleModalSuccess = (modalChatId?: string) => {
    const targetId = modalChatId || createdChatIdRef.current;
    if (targetId) router.push(`/${locale}/niqo/chat/${targetId}`);
  };

  const handleDeleteSuccess = () => {
    setIsDeleted(true);
    setTimeout(() => {
      mutate({ conversationId: null, preview: null }, false);
      setIsDeleted(false);
    }, 600);
  };

  const smileyExternalCycleValue = isLocked ? undefined : twVariantIndex;
  const smileyExternalFading = isLocked ? undefined : twFading;

  return (
    <TooltipProvider>
      {/* 
        h-full ensures it naturally fits the parent `<main>` space,
        which already has the 4rem padding configured for mobile nav.
      */}
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-4 animate-post-enter overflow-hidden">
        {/* 
          Container is relative. The child is absolute. 
          This guarantees the Smiley scaling cannot alter the container height 
          and cause an infinite loop in Safari's ResizeObserver.
        */}
        <div
          ref={smileyContainerRef}
          className="flex-1 min-h-0 relative w-full pt-2 md:pt-4"
        >
          <div className="absolute inset-0 pointer-events-none flex justify-center">
            <div
              className="pointer-events-auto flex-shrink-0 transition-transform duration-75"
              style={{
                transform: `scale(${smileyScale})`,
                transformOrigin: "top center",
              }}
            >
              <HeroSmiley
                lockedMood={currentValue}
                externalCycleValue={smileyExternalCycleValue}
                externalFading={smileyExternalFading}
              />
            </div>
          </div>
        </div>

        {/* Title + Description */}
        <div className="shrink-0 text-center mt-2 mb-2 md:mt-3 md:mb-3 space-y-0.5 md:space-y-1">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {t("niqo.title")}
          </h1>
          <p className="text-foreground-60 mx-auto text-sm md:text-base md:whitespace-nowrap">
            {t("niqo.description")}
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="shrink-0 w-full">
          <div className="relative flex items-center gap-2 bg-surface-opaque border border-surface-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent transition-all">
            {!input && (
              <div
                aria-hidden="true"
                className="absolute left-4 right-16 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-40 text-base select-none"
              >
                <span className="block whitespace-normal break-words leading-normal">
                  {twText}
                  <span
                    className={`inline-block w-px h-[1.1em] align-text-bottom bg-foreground-40 transition-opacity duration-75 ${twCursor ? "opacity-100" : "opacity-0"}`}
                  />
                </span>
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder=""
              rows={1}
              style={
                {
                  fieldSizing: "content",
                  maxHeight: "192px",
                  overflowY: "auto",
                } as React.CSSProperties
              }
              className="flex-1 bg-transparent text-foreground outline-none resize-none leading-normal"
              disabled={isSubmitting}
            />
            <Tooltip content={t("niqo.send")} side="top">
              <button
                type="submit"
                disabled={!input.trim() || isSubmitting}
                className="flex-shrink-0 p-2 bg-brand text-white rounded-full hover:bg-brand-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </Tooltip>
          </div>
        </form>

        {/* Disclaimer */}
        <p className="shrink-0 text-center text-xs text-foreground-40 mt-1 md:mt-2 px-2">
          {t("niqo.disclaimer")}
        </p>

        {/* Previous Conversation Row */}
        {!isLoading && data?.conversationId && (
          <div
            className="shrink-0 mt-2 mb-1 md:mt-3 md:mb-3 transition-opacity duration-500"
            style={{
              opacity: isDeleted ? 0 : 1,
              pointerEvents: isDeleted ? "none" : "auto",
            }}
          >
            <div className="flex items-center gap-2 justify-center">
              <button
                className="flex flex-row items-center gap-3 px-4 py-2 rounded-full border border-surface-border hover:bg-surface-hover cursor-pointer transition-colors"
                onClick={() =>
                  router.push(`/${locale}/niqo/chat/${data.conversationId}`)
                }
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-foreground-60" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground-60">
                    {t("niqo.recent_chat")}
                  </span>
                  {data.preview && (
                    <span className="text-xs text-foreground-40 max-w-[180px] truncate">
                      {data.preview}…
                    </span>
                  )}
                </div>
              </button>

              <Tooltip content={t("niqo.delete_chat_title")} side="top">
                <button
                  aria-label={t("niqo.delete_chat_title")}
                  className="flex items-center justify-center h-10 w-10 rounded-full border border-surface-border hover:bg-surface-hover hover:text-brand text-foreground-60 cursor-pointer transition-colors flex-shrink-0"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        <div className="shrink-0 h-1 md:h-4" />

        <NewNiqoChatModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={executeStartChat}
          onSuccessComplete={handleModalSuccess}
        />

        <DeleteNiqoChatModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onSuccessComplete={handleDeleteSuccess}
        />
      </div>
    </TooltipProvider>
  );
}
