// src/components/ui/emoji-picker.tsx
"use client";

import { ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { categoryIcons, skinTones } from "@/lib/emoji-data";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  EMOJI_DATA,
  EmojiObj,
  filterEmojis,
  findEmojiKey,
  recentlyUsedManager,
  SKIN_TONE_COLORS,
  supportsSkinTone,
} from "@/lib/utils/emoji-utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { Search, X } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

type EmojiItem =
  | { type: "header"; id: string; labelKey: string }
  | { type: "row"; id: string; emojis: EmojiObj[] }
  | { type: "no-results" };

const SKIN_TONES = skinTones;
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

const EmojiList = React.memo(
  ({
    data,
    scrollerRef,
    onEmojiSelect,
    onCategoryChange,
    onHoverEmoji,
    selectedSkinTone,
    t,
    onAdjustReactions,
    onClearRecent,
  }: {
    data: EmojiItem[];
    scrollerRef: React.RefObject<VirtuosoHandle | null>;
    onEmojiSelect: (emoji: string) => void;
    onCategoryChange: (category: string) => void;
    onHoverEmoji: (emoji: EmojiObj | null) => void;
    selectedSkinTone: string | null;
    t: (key: string) => string;
    onAdjustReactions?: () => void;
    onClearRecent: () => void;
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

    const renderEmojiButton = (emoji: string, key: string, name: string) => (
      <div
        key={`${emoji}-${key}`}
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault(); // Prevents textarea from losing focus
          onEmojiSelect(emoji);
        }}
        onMouseEnter={() => onHoverEmoji({ c: emoji, k: key })}
        onMouseLeave={() => onHoverEmoji(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEmojiSelect(emoji);
          }
        }}
        className="relative h-11 w-11 rounded-sm transition-all hover:scale-110 text-[33px] cursor-pointer hover:bg-foreground/10 select-none"
        title={name}
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
          {emoji}
        </span>
      </div>
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
              if (item.id === "your-reactions") {
                return (
                  <div className="px-3 mt-3 mb-2 sticky top-0 bg-background z-10 py-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-semibold text-foreground-60">
                        {t("MessagesPage.your_reactions")}
                      </h3>
                      <button
                        onClick={onAdjustReactions}
                        className="text-xs font-medium text-brand hover:opacity-80 transition-colors cursor-pointer"
                      >
                        {t("MessagesPage.adjust")}
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.id === "recently-used") {
                return (
                  <div className="px-3 mt-3 mb-2 sticky top-0 bg-background z-10 py-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-semibold text-foreground-60">
                        {t("MessagesPage.recently_used")}
                      </h3>
                      <button
                        onClick={onClearRecent}
                        className="text-xs font-medium text-brand hover:opacity-80 transition-colors cursor-pointer"
                      >
                        {t("MessagesPage.clear")}
                      </button>
                    </div>
                  </div>
                );
              }

              const label = t(`Emojis.categories.${item.id}`);

              return (
                <div className="px-3 mt-3 mb-2 sticky top-0 bg-background z-10 py-2">
                  <h3 className="text-xs font-semibold text-foreground-60 px-1">
                    {label}
                  </h3>
                </div>
              );
            }

            if (item.type === "row") {
              return (
                <div className="grid grid-cols-8 gap-1 px-3 mb-1">
                  {item.emojis.map((emojiObj) => {
                    const emojiChar = emojiObj.c;
                    const emojiKey = emojiObj.k;
                    let displayEmoji = emojiChar;
                    if (selectedSkinTone && supportsSkinTone(emojiChar)) {
                      const clean = emojiChar.replace(
                        /[\u{1F3FB}-\u{1F3FF}]/gu,
                        "",
                      );
                      displayEmoji = clean + selectedSkinTone;
                    }
                    const name = emojiKey
                      ? t(`Emojis.names.${emojiKey}`)
                      : emojiChar;
                    return renderEmojiButton(displayEmoji, emojiKey, name);
                  })}
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
EmojiList.displayName = "EmojiList";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
  mode?: "input" | "reaction";
  currentReactions?: string[];
  onAdjustReactions?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

export function EmojiPicker({
  onEmojiSelect,
  className,
  mode = "input",
  currentReactions = ["❤️", "😂", "😮", "😢", "😡", "👍"],
  onAdjustReactions,
  inputRef,
}: EmojiPickerProps) {
  const { t } = useTranslation();

  const [activeCategory, setActiveCategory] =
    useState<string>("smileys_people");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkinTone, setSelectedSkinTone] = useState<string | null>(null);
  const [showSkinTones, setShowSkinTones] = useState(false);
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiObj | null>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() =>
    recentlyUsedManager.getEmojis(),
  );

  const categories = Object.keys(EMOJI_DATA);
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

    if (mode === "reaction") {
      data.push({
        type: "header",
        id: "your-reactions",
        labelKey: "your_reactions",
      });
      const reactionObjs = currentReactions.map((c) => ({
        c,
        k: findEmojiKey(c),
      }));
      addRows("your-reactions", reactionObjs);
    }

    if (recentEmojis.length > 0 && !searchQuery) {
      data.push({
        type: "header",
        id: "recently-used",
        labelKey: "recently_used",
      });
      const recentObjs = recentEmojis.map((c) => ({ c, k: findEmojiKey(c) }));
      addRows("recently-used", recentObjs);
    }

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
  }, [mode, recentEmojis, searchQuery, filteredEmojis, currentReactions]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      // Remove skin tone modifiers (U+1F3FB to U+1F3FF)
      const cleanEmoji = emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
      const finalEmoji =
        selectedSkinTone && supportsSkinTone(cleanEmoji)
          ? cleanEmoji + selectedSkinTone
          : emoji;
      recentlyUsedManager.addEmoji(finalEmoji);
      setRecentEmojis(recentlyUsedManager.getEmojis());
      onEmojiSelect(finalEmoji);
      if (inputRef?.current) {
        inputRef.current.focus();
      }
    },
    [selectedSkinTone, onEmojiSelect, inputRef],
  );

  const handleClearRecent = useCallback(() => {
    recentlyUsedManager.clear();
    setRecentEmojis([]);
  }, []);

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

  const getSkinToneColor = (tone: string | null) =>
    tone
      ? SKIN_TONE_COLORS[tone] || SKIN_TONE_COLORS.default
      : SKIN_TONE_COLORS["null"];

  return (
    <div
      className={cn(
        "flex flex-col bg-surface-opaque rounded-2xl shadow-2xl border border-surface-border overflow-hidden cursor-default",
        className,
      )}
      style={{ width: "352px", height: "420px" }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center transition-all duration-300 ease-in-out min-w-0 flex-1">
            <Search className="absolute left-3 h-4 w-4 text-foreground-40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("MessagesPage.search_placeholder")}
              className="w-full py-2 pl-9 pr-9 rounded-lg bg-background text-sm outline-none placeholder:text-foreground-40 focus:ring-2 focus:ring-brand transition-all border border-surface-border text-foreground"
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
          <div className="flex items-center gap-1 flex-shrink-0 select-none">
            <div
              className="flex items-center gap-1 transition-all duration-300 ease-in-out overflow-hidden justify-end"
              style={{
                width: showSkinTones
                  ? `${(SKIN_TONES.length - 1) * 27.2}px`
                  : "0px",
              }}
            >
              {SKIN_TONES.filter((tone) => tone !== selectedSkinTone).map(
                (tone, index) => {
                  // Map skin tone to translation key
                  let toneKey = "skin_tone_default";
                  if (tone === "🏻") toneKey = "skin_tone_light";
                  else if (tone === "🏼") toneKey = "skin_tone_medium_light";
                  else if (tone === "🏽") toneKey = "skin_tone_medium";
                  else if (tone === "🏾") toneKey = "skin_tone_medium_dark";
                  else if (tone === "🏿") toneKey = "skin_tone_dark";
                  return (
                    <Tooltip
                      key={tone || "default"}
                      content={t(`Emojis.${toneKey}`)}
                      side="top"
                    >
                      <div
                        onClick={() => {
                          setSelectedSkinTone(tone);
                          setShowSkinTones(false);
                        }}
                        className="h-6 w-6 rounded-md transition-all duration-200 hover:scale-110 cursor-pointer border border-surface-border flex-shrink-0"
                        style={{
                          backgroundColor: getSkinToneColor(tone),
                          animation: showSkinTones
                            ? `slideIn 0.15s ease-out ${index * 0.05}s both`
                            : "none",
                        }}
                      />
                    </Tooltip>
                  );
                },
              )}
            </div>
            {/* Tooltip for trigger button shows current skin tone name if open, else default */}
            <Tooltip
              content={
                showSkinTones
                  ? (() => {
                      let toneKey = "skin_tone_default";
                      if (selectedSkinTone === "🏻")
                        toneKey = "skin_tone_light";
                      else if (selectedSkinTone === "🏼")
                        toneKey = "skin_tone_medium_light";
                      else if (selectedSkinTone === "🏽")
                        toneKey = "skin_tone_medium";
                      else if (selectedSkinTone === "🏾")
                        toneKey = "skin_tone_medium_dark";
                      else if (selectedSkinTone === "🏿")
                        toneKey = "skin_tone_dark";
                      return t(`Emojis.${toneKey}`);
                    })()
                  : t("Emojis.skin_tone_picker")
              }
              side="top"
            >
              <div
                onClick={() => setShowSkinTones(!showSkinTones)}
                className="flex-shrink-0 w-6 h-6 rounded-md transition-all duration-200 hover:scale-110 cursor-pointer border border-surface-border z-10"
                style={{ backgroundColor: getSkinToneColor(selectedSkinTone) }}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Category nav */}
      <div className="grid grid-cols-8 gap-1 px-3 py-2 border-b border-surface-border select-none">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          const categoryName = t(`Emojis.categories.${category}`);
          return (
            <Tooltip key={category} content={categoryName} side="top">
              <div
                role="button"
                tabIndex={0}
                onClick={() => scrollToCategory(category)}
                className={cn(
                  "relative h-11 w-11 rounded-lg transition-all cursor-pointer hover:bg-foreground/10",
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
                  className="text-[32px] transition-transform hover:scale-110"
                >
                  {CATEGORY_ICONS[category]}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Emoji list */}
      <div className="flex-1 overflow-hidden bg-background">
        <EmojiList
          data={virtuosoData}
          scrollerRef={virtuosoRef}
          onEmojiSelect={handleEmojiSelect}
          onCategoryChange={handleCategoryChange}
          onHoverEmoji={setHoveredEmoji}
          selectedSkinTone={selectedSkinTone}
          t={t}
          onAdjustReactions={onAdjustReactions}
          onClearRecent={handleClearRecent}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-surface-border px-3 py-2 h-14 flex items-center">
        <div className="flex items-center gap-2 select-none">
          <span className="text-3xl">
            {hoveredEmoji ? hoveredEmoji.c : "😊"}
          </span>
          <span className="text-sm text-foreground-60 truncate max-w-[280px]">
            {hoveredEmoji && hoveredEmoji.k
              ? t(`Emojis.names.${hoveredEmoji.k}`)
              : t("Emojis.whats_your_mood")}
          </span>
        </div>
      </div>
    </div>
  );
}
