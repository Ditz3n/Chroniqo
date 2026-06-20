// src/components/ui/icon-picker-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ICON_PALETTE } from "@/lib/constants";
import { categoryIcons } from "@/lib/emoji-data";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { EMOJI_DATA, EmojiObj, filterEmojis } from "@/lib/utils/emoji-utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { Ban, Search, X } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Tooltip } from "./tooltip";

// Minimum contrast ratio threshold to decide whether the emoji hint text is
// dark or light over the chosen background color.
function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance formula (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

type EmojiItem =
  | { type: "header"; id: string; labelKey: string }
  | { type: "row"; id: string; emojis: EmojiObj[] }
  | { type: "no-results" };

const CATEGORY_ICONS: Record<string, string> = categoryIcons;
const EMOJI_GRID_COLS = 8;

// Reusable Virtuoso scroller that integrates with Radix ScrollArea
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

const IconEmojiList = React.memo(
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
IconEmojiList.displayName = "IconEmojiList";

export interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current values - undefined means nothing is set yet
  currentEmoji?: string | null;
  currentBgColor?: string | null;
  // Shape of the preview: "round" for avatars, "rect" for headers
  previewShape?: "round" | "rect";
  onConfirm: (emoji: string | null, bgColor: string) => void;
  title?: string;
  // Whether the modal is currently saving (shows spinner on confirm button)
  isSaving?: boolean;
}

export function IconPickerModal({
  isOpen,
  onClose,
  currentEmoji,
  currentBgColor,
  previewShape = "round",
  onConfirm,
  title,
  isSaving = false,
}: IconPickerModalProps) {
  const { t } = useTranslation();

  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(
    currentEmoji ?? null,
  );
  // Store the selected color as the palette object (with both css and hex)
  const [selectedBgColor, setSelectedBgColor] = useState<string>(
    currentBgColor ?? ICON_PALETTE[6].css, // Default: sky blue
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<string>("smileys_people");
  const [isEmojiAnimating, setIsEmojiAnimating] = useState(false);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      // Guard: skip if already animating or same emoji re-selected
      if (isEmojiAnimating || emoji === selectedEmoji) return;
      setIsEmojiAnimating(true);
      setTimeout(() => {
        setSelectedEmoji(emoji);
        setIsEmojiAnimating(false);
      }, 150);
    },
    [isEmojiAnimating, selectedEmoji],
  );

  // Track open state to reset internal state when re-opening
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setSelectedEmoji(currentEmoji ?? null);
    setSelectedBgColor(currentBgColor ?? ICON_PALETTE[6].css);
    setSearchQuery("");
    setActiveCategory("smileys_people");
    setIsEmojiAnimating(false);
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
  const darkBg = isDarkColor(selectedBgColor);

  const handleConfirm = () => {
    // Find the palette entry for the selected color
    const palette = ICON_PALETTE.find(
      (c) => c.css === selectedBgColor || c.hex === selectedBgColor,
    );
    // Always send hex to backend
    onConfirm(selectedEmoji, palette ? palette.hex : selectedBgColor);
  };

  // Build preview dimensions for the header rectangle shape
  const previewIsRect = previewShape === "rect";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex flex-col overflow-hidden cursor-default p-0 gap-0 bg-surface-opaque"
        style={{
          height: "min(90dvh, 640px)",
          maxWidth: "448px",
          minHeight: 0,
          margin: "5dvh 4vw", // Match edit community modal spacing
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 h-16 shrink-0">
          <DialogTitle className="text-lg font-bold text-foreground">
            {title ?? t("iconPicker.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 min-h-0 bg-background">
          {/* Live preview with None button overlayed in bottom right */}
          <div className="px-6 py-4 flex justify-center items-center">
            <div className="relative">
              {previewIsRect ? (
                // Rectangular header preview
                <div
                  className="w-full h-20 rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: selectedBgColor, width: 320 }}
                >
                  {selectedEmoji ? (
                    <span
                      className="text-5xl leading-none select-none transition-all duration-150 ease-in-out"
                      style={{
                        transform: `translateY(-2px) ${isEmojiAnimating ? "scale(0)" : "scale(1)"}`,
                        opacity: isEmojiAnimating ? 0 : 1,
                      }}
                    >
                      {selectedEmoji}
                    </span>
                  ) : (
                    // Subtle placeholder when no emoji is selected
                    <span
                      className={cn(
                        "text-sm font-medium select-none",
                        darkBg ? "text-white/40" : "text-black/30",
                      )}
                    >
                      {t("iconPicker.no_emoji_preview")}
                    </span>
                  )}
                </div>
              ) : (
                // Circular avatar preview
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center overflow-hidden border-4 border-surface-border"
                  style={{ backgroundColor: selectedBgColor }}
                >
                  {selectedEmoji ? (
                    <span
                      className="text-5xl leading-none select-none transition-all duration-150 ease-in-out"
                      style={{
                        transform: `translateY(-2px) ${isEmojiAnimating ? "scale(0)" : "scale(1)"}`,
                        opacity: isEmojiAnimating ? 0 : 1,
                      }}
                    >
                      {selectedEmoji}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-bold select-none",
                        darkBg ? "text-white/40" : "text-black/30",
                      )}
                    >
                      {t("iconPicker.no_emoji_preview")}
                    </span>
                  )}
                </div>
              )}
              {/* None/clear button overlayed in bottom right */}
              <div className="absolute -bottom-2 -right-2 z-20">
                <Tooltip content={t("iconPicker.no_emoji")} side="top">
                  <button
                    onClick={() => setSelectedEmoji(null)}
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-full transition-all cursor-pointer border-2 bg-surface-opaque",
                      selectedEmoji === null
                        ? "border-foreground scale-110 shadow-md bg-surface-opaque"
                        : "border-surface-border hover:scale-110 hover:border-foreground/30",
                    )}
                    aria-label={t("iconPicker.no_emoji")}
                    aria-pressed={selectedEmoji === null}
                  >
                    <Ban className="h-4 w-4 text-foreground-40" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Background color palette */}
          <div className="px-6 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-40 mb-2">
              {t("iconPicker.background_color")}
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_PALETTE.map((color) => {
                const isSelected =
                  selectedBgColor === color.css ||
                  selectedBgColor === color.hex;
                return (
                  <Tooltip key={color.css} content={color.label} side="top">
                    <button
                      onClick={() => {
                        setSelectedBgColor(color.css);
                      }}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all cursor-pointer border-2",
                        isSelected
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent hover:scale-110 hover:border-foreground/30",
                      )}
                      style={{ backgroundColor: color.css }}
                      aria-label={color.label}
                      aria-pressed={isSelected}
                    />
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="border-t border-surface-border mx-6 mb-0" />

          {/* Search */}
          <div className="px-6 py-3">
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

          {/* Emoji list - fixed height so Virtuoso has a container, and the outer ScrollArea handles modal scrolling */}
          <div className="h-64">
            <IconEmojiList
              data={virtuosoData}
              scrollerRef={virtuosoRef}
              onEmojiClick={handleEmojiSelect}
              onCategoryChange={handleCategoryChange}
              t={t}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border bg-surface">
          <button
            onClick={onClose}
            className="text-sm font-medium text-foreground-60 hover:text-foreground transition-colors px-3 py-2 cursor-pointer"
          >
            {t("MessagesPage.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            className="flex items-center gap-2 text-sm font-medium text-white bg-brand hover:opacity-90 transition-opacity px-4 py-2 rounded-md cursor-pointer disabled:opacity-60"
          >
            {isSaving && (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {t("MessagesPage.save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
