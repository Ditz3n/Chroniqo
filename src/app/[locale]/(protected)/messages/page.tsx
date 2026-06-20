// src/app/[locale]/(protected)/messages/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ChatView } from "./(components)/chat-view";
import { MessagesSidebar } from "./(components)/messages-sidebar";

const ANIM_MS = 220;

export default function MessagesPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialChatId = searchParams.get("chat");

  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialChatId,
  );
  const [activeView, setActiveView] = useState<"list" | "chat">(
    initialChatId ? "chat" : "list",
  );
  const [exitingView, setExitingView] = useState<"list" | "chat" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transition helpers
  const goTo = (view: "list" | "chat", incomingChatId?: string) => {
    if (isTransitioning) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setExitingView(activeView);
    setIsTransitioning(true);
    setActiveView(view);
    if (incomingChatId !== undefined) setSelectedChatId(incomingChatId);
    timerRef.current = setTimeout(() => {
      setExitingView(null);
      setIsTransitioning(false);
      if (view === "list") setSelectedChatId(null);
    }, ANIM_MS);
  };

  const handleSelectChat = (id: string) => goTo("chat", id);

  const handleBack = () => goTo("list");

  // Panel state helpers
  const listState =
    activeView === "list" && !exitingView
      ? "active"
      : activeView === "list" && !!exitingView
        ? "entering"
        : exitingView === "list"
          ? "exiting"
          : "hidden";

  const chatState =
    activeView === "chat" && !exitingView
      ? "active"
      : activeView === "chat" && !!exitingView
        ? "entering"
        : exitingView === "chat"
          ? "exiting"
          : "hidden";

  const chatPanelId = selectedChatId;

  return (
    <div className="absolute inset-0 flex w-full bg-background overflow-hidden">
      {/* Mobile: two chat-panel divs with fade transition */}
      <div className="flex md:hidden w-full h-full relative overflow-hidden">
        {/* List panel */}
        <div
          data-state={listState}
          className="chat-panel absolute inset-0 overflow-hidden bg-background"
        >
          <MessagesSidebar
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChatId}
          />
        </div>

        {/* Chat panel */}
        {chatPanelId && (
          <div
            key={chatPanelId}
            data-state={chatState}
            className="chat-panel absolute inset-0 overflow-hidden bg-background"
          >
            <ChatView chatId={selectedChatId} onBack={handleBack} />
          </div>
        )}
      </div>

      {/* Desktop: side-by-side, no panel animations */}
      <div className="hidden md:flex w-full h-full overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            "h-full flex-shrink-0 border-r border-surface-border bg-background z-10",
            "w-[88px] lg:w-[400px]",
          )}
        >
          <MessagesSidebar
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChatId}
          />
        </div>

        {/* Chat area */}
        <div className="h-full flex-1 min-w-0 bg-background relative">
          {selectedChatId ? (
            <ChatView
              chatId={selectedChatId}
              onBack={() => {
                setSelectedChatId(null);
              }}
            />
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full w-full text-foreground-40">
              <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {t("MessagesPage.select_chat_to_start")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
