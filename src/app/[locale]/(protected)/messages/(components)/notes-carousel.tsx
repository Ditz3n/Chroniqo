// src/app/[locale]/(protected)/messages/(components)/notes-carousel.tsx
"use client";

import { Smiley } from "@/app/(components)/smiley";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDailyStatus } from "@/context/daily-status-context";
import { DAILY_STATUSES } from "@/lib/constants";
import {
  useConversations,
  useNotesCarousel,
  useQuickReactions,
  useTodayStatus,
} from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { ApiConversation, CarouselStatus } from "@/types/app-types";
import { ChevronLeft, ChevronRight, Plus, Send, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function NotesCarousel({
  onSelectChat,
}: {
  onSelectChat: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { data: carouselData, isLoading } = useNotesCarousel();
  const { data: convData } = useConversations();
  const { data: quickReactionsData } = useQuickReactions();
  const { openInterceptor } = useDailyStatus();
  const { data: todayData } = useTodayStatus();
  const myStatus = todayData?.status;

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedNote, setSelectedNote] = useState<CarouselStatus | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const defaultReactions: string[] = quickReactionsData?.quickReactions || [
    "❤️",
    "😂",
    "😮",
    "😢",
    "😡",
    "👍",
  ];
  const allNotes: CarouselStatus[] = carouselData?.statuses || [];

  const itemsPerPage = 4;
  const totalPages = Math.ceil((allNotes.length + 1) / itemsPerPage);
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) setCurrentPage(page);
  };

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const showYourNote = currentPage === 0;
  const visibleNotes = allNotes.slice(
    showYourNote ? Math.max(0, startIndex - 1) : startIndex - 1,
    showYourNote ? endIndex - 1 : endIndex - 1,
  );

  const circleSize = 64;

  const handleSendReply = async (content: string) => {
    if (!selectedNote || isSending || !content.trim()) return;
    setIsSending(true);

    try {
      // Reuse an existing 1:1 conversation with this user if one already exists
      const conversations = convData?.conversations || [];
      const existingConv = conversations.find(
        (c: ApiConversation) =>
          !c.isCommunity &&
          c.participants.length === 2 &&
          c.participants.some((p) => p.user.id === selectedNote.user.id),
      );

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const convRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantIds: [selectedNote.user.id],
            durationHours: 24,
          }),
        });

        if (!convRes.ok) throw new Error("Failed to get conversation");
        const { conversation } = await convRes.json();
        conversationId = conversation.id;
      }

      const msgRes = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            dailyStatusId: selectedNote.id,
          }),
        },
      );

      if (!msgRes.ok) throw new Error("Failed to send message");

      setSelectedNote(null);
      setIsReplying(false);
      setInputText("");

      onSelectChat(conversationId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && allNotes.length === 0) {
    return (
      <div className="w-full h-[120px] flex items-center justify-center border-b border-surface-border">
        <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full py-3 border-b border-surface-border">
        {canGoPrev && (
          <button
            onClick={() => goToPage(currentPage - 1)}
            className="absolute left-1 top-[62px] z-10 rounded-full bg-surface-opaque p-1.5 shadow-md hover:bg-surface-hover border-surface-border cursor-pointer transition-colors text-foreground-60 group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {canGoNext && (
          <button
            onClick={() => goToPage(currentPage + 1)}
            className="absolute right-1 top-[62px] z-10 rounded-full bg-surface-opaque p-1.5 shadow-md hover:bg-surface-hover border-surface-border cursor-pointer transition-colors text-foreground-60 group"
          >
            <ChevronRight className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
        )}

        <div className="px-6 flex justify-start gap-4 items-end h-[120px] overflow-hidden">
          {showYourNote && (
            <div
              className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
              style={{ width: `${circleSize}px` }}
              onClick={() => openInterceptor(myStatus?.value)}
            >
              {/* Bubble */}
              <div className="relative mb-2">
                <div
                  className="rounded-xl bg-surface-opaque border border-surface-border pt-1.5 pb-1.5 px-2 text-[10px] leading-tight text-center shadow-sm -mb-5 z-20 relative group-hover:-translate-y-1 transition-transform"
                  style={{
                    width: "64px",
                    minHeight: "36px",
                    maxHeight: "56px",
                  }}
                >
                  <span
                    className={cn(
                      "line-clamp-2 font-medium break-words",
                      myStatus?.note ? "text-foreground" : "text-foreground-40",
                    )}
                  >
                    {myStatus?.note || t("MessagesPage.notePlaceholder")}
                  </span>
                </div>

                <div className="absolute -bottom-6 left-3 z-20">
                  <div className="w-2 h-2 rotate-45 bg-surface-opaque border-r border-b border-surface-border" />
                </div>
              </div>

              {/* Avatar */}
              <div className="relative">
                <Avatar
                  style={
                    {
                      height: `${circleSize}px`,
                      width: `${circleSize}px`,
                      "--tw-ring-color": getMoodRingColor(myStatus?.value),
                    } as React.CSSProperties
                  }
                  className="border-2 border-surface-border ring-2 ring-offset-2 ring-offset-background"
                >
                  {session?.user?.image && (
                    <AvatarImage src={session.user.image} />
                  )}
                  {!session?.user?.image && session?.user?.avatarBgColor ? (
                    <IconAvatar
                      emoji={session.user.avatarEmoji}
                      bgColor={session.user.avatarBgColor}
                      emojiSizeClass="text-3xl"
                    />
                  ) : (
                    <AvatarFallback className="bg-surface text-foreground font-bold">
                      {session?.user?.username?.[0]?.toUpperCase() ||
                        session?.user?.name?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="absolute bottom-0 right-0 bg-brand border-2 border-background rounded-full h-5 w-5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              <span className="text-xs text-foreground-60 mt-1.5 font-medium truncate w-full text-center">
                {t("MessagesPage.yourNote")}
              </span>
            </div>
          )}

          {visibleNotes.map((note) => (
            <div
              key={note.id}
              className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
              style={{ width: `${circleSize}px` }}
              onClick={() => setSelectedNote(note)}
            >
              <div
                className="relative mb-2"
                onClick={() => setSelectedNote(note)}
              >
                {note.note ? (
                  <>
                    <div
                      className="rounded-xl bg-surface-opaque border border-surface-border pt-1.5 pb-1.5 px-2 text-[10px] leading-tight text-center shadow-sm -mb-5 z-20 relative group-hover:-translate-y-1 transition-transform"
                      style={{
                        width: "64px",
                        minHeight: "36px",
                        maxHeight: "56px",
                      }}
                    >
                      <span className="line-clamp-2 text-foreground font-medium break-words">
                        {note.note}
                      </span>
                    </div>
                    <div className="absolute -bottom-6 left-3 z-20">
                      <div className="w-2 h-2 rotate-45 bg-surface-opaque border-r border-b border-surface-border" />
                    </div>
                  </>
                ) : (
                  <div style={{ height: "36px", marginBottom: "-20px" }} />
                )}
              </div>

              <div
                className="relative cursor-pointer"
                onClick={() => setSelectedNote(note)}
              >
                <Avatar
                  style={
                    {
                      height: `${circleSize}px`,
                      width: `${circleSize}px`,
                      "--tw-ring-color": DAILY_STATUSES[note.value].color,
                    } as React.CSSProperties
                  }
                  className="border-2 border-surface-border ring-2 ring-offset-2 ring-offset-background"
                >
                  {note.user.image && <AvatarImage src={note.user.image} />}
                  {!note.user.image && note.user.avatarBgColor ? (
                    <IconAvatar
                      emoji={note.user.avatarEmoji}
                      bgColor={note.user.avatarBgColor}
                      emojiSizeClass="text-3xl"
                    />
                  ) : (
                    <AvatarFallback className="bg-background text-foreground font-bold">
                      {note.user.username?.[0]?.toUpperCase() ||
                        note.user.name?.[0]?.toUpperCase() ||
                        "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <span className="text-xs text-foreground-60 mt-1.5 font-medium truncate w-full text-center">
                {note.user.username || note.user.name}
              </span>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-3 gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === currentPage
                    ? "w-4 bg-brand"
                    : "w-1.5 bg-foreground-40 hover:bg-foreground-60",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Note Modal */}
      <Dialog
        open={!!selectedNote}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNote(null);
            setIsReplying(false);
            setInputText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-surface-border bg-background gap-0 transition-all duration-500">
          <DialogTitle className="sr-only">User Note</DialogTitle>
          {selectedNote && (
            <>
              <div
                className={cn(
                  "flex flex-col items-center justify-center relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  isReplying ? "pt-6 pb-4 px-6" : "pt-10 pb-8 px-6",
                )}
                style={{
                  backgroundColor: DAILY_STATUSES[selectedNote.value].color,
                }}
              >
                <button
                  onClick={() => {
                    setSelectedNote(null);
                    setIsReplying(false);
                  }}
                  className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-black/10 rounded-full p-2 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
                <div
                  className={cn(
                    "transition-all duration-500",
                    isReplying ? "w-16 h-16 mb-2" : "w-28 h-28 mb-4",
                  )}
                >
                  <Smiley statusValue={selectedNote.value} color="white" />
                </div>
                {!isReplying && (
                  <div className="bg-black/20 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                    {t(DAILY_STATUSES[selectedNote.value].labelKey)}
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col gap-5 bg-background">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-surface-border">
                    {selectedNote.user.image && (
                      <AvatarImage src={selectedNote.user.image} />
                    )}
                    {!selectedNote.user.image &&
                    selectedNote.user.avatarBgColor ? (
                      <IconAvatar
                        emoji={selectedNote.user.avatarEmoji}
                        bgColor={selectedNote.user.avatarBgColor}
                        emojiSizeClass="text-3xl"
                      />
                    ) : (
                      <AvatarFallback className="font-bold">
                        {selectedNote.user.username?.[0]?.toUpperCase() ||
                          selectedNote.user.name?.[0]?.toUpperCase() ||
                          "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="font-bold text-foreground text-lg">
                    {selectedNote.user.username || selectedNote.user.name}
                  </span>
                </div>

                {selectedNote.note && (
                  <div className="bg-surface-opaque border border-surface-border rounded-xl p-4 relative">
                    <p
                      className="text-foreground font-medium text-sm leading-relaxed break-words overflow-x-hidden"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      &quot;{selectedNote.note}&quot;
                    </p>
                  </div>
                )}

                {!isReplying ? (
                  <Button
                    className="w-full mt-2 cursor-pointer"
                    onClick={() => setIsReplying(true)}
                  >
                    {t("MessagesPage.reply_to_note")}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between gap-2 px-1">
                      {defaultReactions.map((emoji: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => handleSendReply(emoji)}
                          disabled={isSending}
                          className="h-10 w-10 text-2xl flex items-center justify-center hover:bg-foreground/5 rounded-full transition-transform hover:scale-110 disabled:opacity-50 cursor-pointer"
                        >
                          <span style={{ transform: "translateY(-2px)" }}>
                            {emoji}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 rounded-3xl border border-surface-border bg-surface px-3 py-1.5 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                      <textarea
                        autoFocus
                        value={inputText}
                        maxLength={1000}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(inputText);
                          }
                        }}
                        placeholder={t("MessagesPage.type_reply_to_note")}
                        className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-foreground-40 text-foreground resize-none max-h-32 min-h-[32px] break-words whitespace-pre-wrap"
                        rows={1}
                        onInput={(e) => {
                          const t = e.target as HTMLTextAreaElement;
                          t.style.height = "auto";
                          t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                        }}
                      />
                      <button
                        onClick={() => handleSendReply(inputText)}
                        disabled={isSending || !inputText.trim()}
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-brand text-white transition-all disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95 flex-shrink-0"
                      >
                        {isSending ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
