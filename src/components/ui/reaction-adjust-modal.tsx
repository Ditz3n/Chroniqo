// src/components/ui/reaction-adjust-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollBar } from "@/components/ui/scroll-area";
import { categoryIcons } from "@/lib/emoji-data";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  EMOJI_DATA,
  EmojiObj,
  filterEmojis,
  findEmojiKey,
} from "@/lib/utils/emoji-utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { Search, X } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Tooltip } from "./tooltip";

type EmojiItem =
  | { type: "header"; id: string; labelKey: string }
  | { type: "row"; id: string; emojis: EmojiObj[] }
  | { type: "no-results" };

const CATEGORY_ICONS: Record<string, string> = categoryIcons;
const EMOJI_GRID_COLS = 8;

const VirtuosoScroller = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <ScrollAreaPrimitive.Viewport
    {...props}
    ref={ref as React.ForwardedRef<HTMLDivElement>}
    className="h-full w-full rounded-[inherit] [>div]:!block"
  />
));
VirtuosoScroller.displayName = "VirtuosoScroller";

const ReactionEmojiList = React.memo(
  ({
    data,
    scrollerRef,
    onEmojiClick,
    onCategoryChange,
    t,
  }: {
    data: EmojiItem[];
    scrollerRef: React.RefObject<VirtuosoHandle | null>;
    onEmojiClick: (emoji: string) => void;
    onCategoryChange: (category: string) => void;
    t: (key: string) => string;
  }) => {
    const handleRangeChanged = useCallback(
      (range: { startIndex: number }) => {
        const item = data[range.startIndex];
        if (item && (item.type === "header" || item.type === "row")) {
          onCategoryChange(item.id);
        }
      },
      [data, onCategoryChange],
    );

    return (
      <ScrollAreaPrimitive.Root className="h-full w-full overflow-hidden relative">
        <Virtuoso
          ref={scrollerRef}
          style={{ height: "100%" }}
          data={data}
          rangeChanged={handleRangeChanged}
          components={{
            Scroller: VirtuosoScroller,
            EmptyPlaceholder: () => (
              <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-40">
                <span className="text-4xl mb-2">🔍</span>
                <span className="text-sm">
                  {t("MessagesPage.no_emojis_found")}
                </span>
              </div>
            ),
            Footer: () => <div className="h-6" />,
          }}
          itemContent={(_index, item) => {
            if (item.type === "no-results") {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-foreground-40">
                  <span className="text-4xl mb-2">🔍</span>
                  <span className="text-sm">
                    {t("MessagesPage.no_emojis_found")}
                  </span>
                </div>
              );
            }

            if (item.type === "header") {
              return (
                <div className="px-3 sticky top-0 bg-background z-10 py-2">
                  <h3 className="text-xs font-semibold text-foreground-60 px-1">
                    {t(`Emojis.categories.${item.id}`)}
                  </h3>
                </div>
              );
            }

            if (item.type === "row") {
              return (
                <div className="grid grid-cols-8 gap-1 px-3 mb-1">
                  {item.emojis.map((emojiObj, emojiIndex) => (
                    <Tooltip
                      key={`${emojiObj.c}-${emojiIndex}`}
                      content={t(`Emojis.names.${emojiObj.k}`)}
                      side="top"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onEmojiClick(emojiObj.c)}
                        className="relative h-11 w-11 rounded-sm transition-all hover:scale-110 text-[33px] cursor-pointer hover:bg-foreground/10"
                      >
                        {/* Span is needed to properly center the emoji icons */}
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 0,
                            transform: "translateY(-2px)",
                          }}
                        >
                          {emojiObj.c}
                        </span>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              );
            }

            return null;
          }}
        />
        <ScrollBar orientation="vertical" className="z-50" />
      </ScrollAreaPrimitive.Root>
    );
  },
);
ReactionEmojiList.displayName = "ReactionEmojiList";

interface ReactionAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReactions: string[];
  onReactionsUpdate: (reactions: string[]) => void;
}

export function ReactionAdjustModal({
  isOpen,
  onClose,
  currentReactions,
  onReactionsUpdate,
}: ReactionAdjustModalProps) {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReactionIndex, setSelectedReactionIndex] = useState<
    number | null
  >(null);
  const [activeCategory, setActiveCategory] =
    useState<string>("smileys_people");

  const [isAnimating, setIsAnimating] = useState(false);
  const [resettingIndices, setResettingIndices] = useState<number[]>([]);
  const [localReactions, setLocalReactions] =
    useState<string[]>(currentReactions);
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setLocalReactions(currentReactions);
    setSearchQuery("");
    setSelectedReactionIndex(null);
    setResettingIndices([]);
    setIsAnimating(false);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isUserScrollingRef = useRef(false);

  const filteredEmojis = useMemo(() => {
    const translator = (key: string) => {
      const localKey = key.replace("Emojis.", "");
      return t(`Emojis.${localKey}`);
    };
    return filterEmojis(searchQuery, translator);
  }, [searchQuery, t]);

  const virtuosoData = useMemo<EmojiItem[]>(() => {
    const data: EmojiItem[] = [];
    const addRows = (id: string, emojis: EmojiObj[]) => {
      for (let i = 0; i < emojis.length; i += EMOJI_GRID_COLS) {
        data.push({
          type: "row",
          id,
          emojis: emojis.slice(i, i + EMOJI_GRID_COLS),
        });
      }
    };

    const hasMatches = Object.keys(filteredEmojis).length > 0;
    if (hasMatches) {
      Object.entries(filteredEmojis).forEach(([category, emojis]) => {
        if (emojis.length > 0) {
          data.push({ type: "header", id: category, labelKey: category });
          addRows(category, emojis);
        }
      });
    } else if (searchQuery) {
      data.push({ type: "no-results" });
    }

    return data;
  }, [filteredEmojis, searchQuery]);

  const handleEmojiClick = useCallback(
    (emoji: string) => {
      if (
        selectedReactionIndex !== null &&
        !isAnimating &&
        resettingIndices.length === 0
      ) {
        // Prevent updating if the selected emoji is already the same
        if (localReactions[selectedReactionIndex] === emoji) return;
        setIsAnimating(true);
        setTimeout(() => {
          setLocalReactions((prev) => {
            const newReactions = [...prev];
            if (selectedReactionIndex !== null) {
              newReactions[selectedReactionIndex] = emoji;
            }
            return newReactions;
          });
          setTimeout(() => {
            setIsAnimating(false);
          }, 50);
        }, 200);
      }
    },
    [
      selectedReactionIndex,
      isAnimating,
      resettingIndices.length,
      localReactions,
    ],
  );

  const handleSave = () => {
    onReactionsUpdate(localReactions);
    onClose();
  };

  const handleReset = () => {
    if (resettingIndices.length > 0 || isAnimating) return;

    const indicesToReset: number[] = [];
    localReactions.forEach((emoji, index) => {
      if (emoji !== currentReactions[index]) indicesToReset.push(index);
    });

    if (indicesToReset.length === 0) {
      setLocalReactions(currentReactions);
      return;
    }

    setResettingIndices(indicesToReset);
    setSelectedReactionIndex(null);

    setTimeout(() => {
      setLocalReactions(currentReactions);
      requestAnimationFrame(() => setResettingIndices([]));
    }, 200);
  };

  const handleCategoryChange = useCallback((category: string) => {
    if (!isUserScrollingRef.current) {
      setActiveCategory((prev) => (prev !== category ? category : prev));
    }
  }, []);

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    isUserScrollingRef.current = true;
    const index = virtuosoData.findIndex(
      (item) => item.type === "header" && item.id === category,
    );

    if (index !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index,
        align: "start",
        behavior: "smooth",
      });
    }
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
  };

  const categories = Object.keys(EMOJI_DATA);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex flex-col overflow-hidden cursor-default p-0 gap-0 bg-surface-opaque"
        style={{ height: "calc(100vh - 10rem)", maxWidth: "448px" }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 h-16">
          <DialogTitle className="text-lg">
            {t("MessagesPage.customize_reactions")}
          </DialogTitle>
        </DialogHeader>

        {/* Middle content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Current Reactions */}
          <div className="px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 select-none">
              {localReactions.map((emoji, index) => {
                const isSelected = selectedReactionIndex === index;
                const isThisAnimating =
                  (isSelected && isAnimating) ||
                  resettingIndices.includes(index);
                const emojiKey = findEmojiKey(emoji);
                return (
                  <Tooltip
                    key={index}
                    content={t(`Emojis.names.${emojiKey}`)}
                    side="top"
                  >
                    <div
                      onClick={() => {
                        if (isAnimating || resettingIndices.length > 0) return;
                        // Toggle selection: deselect if already selected, select if not
                        setSelectedReactionIndex((prev) =>
                          prev === index ? null : index,
                        );
                      }}
                      className={cn(
                        "relative flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all duration-200",
                        !isSelected && "hover:bg-foreground/10 hover:scale-110",
                        isSelected
                          ? "bg-brand/20 ring-2 ring-brand"
                          : "bg-transparent",
                      )}
                    >
                      <span
                        style={{
                          lineHeight: 0,
                          transform: `translateY(-2px) ${isThisAnimating ? "scale(0)" : "scale(1)"}`,
                        }}
                        className={cn(
                          "text-[33px] transition-all duration-200 ease-in-out",
                          isThisAnimating ? "opacity-0" : "opacity-100",
                        )}
                      >
                        {emoji}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="px-6 pb-4 flex-shrink-0">
            <p className="text-sm text-foreground-60 text-center">
              {t("MessagesPage.reaction_modal_instructions")}
            </p>
          </div>

          {/* Search */}
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("MessagesPage.search_placeholder")}
                className="h-10 w-full rounded-lg border border-surface-border bg-surface pl-11 pr-9 text-sm font-medium outline-none placeholder:text-foreground-40 focus:ring-2 focus:ring-brand transition-all text-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-foreground-40 hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category icons */}
          <div className="grid grid-cols-8 gap-1 px-3 py-2 border-b border-surface-border">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <Tooltip
                  key={category}
                  content={t(`Emojis.categories.${category}`)}
                  side="top"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollToCategory(category)}
                    className={cn(
                      "flex-shrink-0 relative h-11 w-11 rounded-lg transition-all hover:scale-110 cursor-pointer hover:bg-foreground/10",
                      isActive && "bg-foreground/10",
                    )}
                  >
                    {/* Span is needed to properly center the emoji icons */}
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 0,
                        transform: "translateY(-2px)",
                      }}
                      className="text-[33px] transition-transform"
                    >
                      {CATEGORY_ICONS[category]}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>

          {/* Emoji list */}
          <div className="flex-1 overflow-hidden">
            <ReactionEmojiList
              data={virtuosoData}
              scrollerRef={virtuosoRef}
              onEmojiClick={handleEmojiClick}
              onCategoryChange={handleCategoryChange}
              t={t}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 p-4 border-t border-surface-border">
          <button
            onClick={handleReset}
            className="text-sm font-medium text-foreground-60 hover:text-foreground transition-colors px-3 py-2 cursor-pointer"
          >
            {t("MessagesPage.reset")}
          </button>
          <button
            onClick={handleSave}
            className="text-sm font-medium text-white bg-brand hover:opacity-90 transition-opacity px-4 py-2 rounded-md cursor-pointer"
          >
            {t("MessagesPage.save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
