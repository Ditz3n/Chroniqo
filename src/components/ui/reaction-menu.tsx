// src/components/ui/reaction-menu.tsx
"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { EMOJI_DATA } from "@/lib/utils/emoji-utils";
import React, { forwardRef } from "react";

interface ReactionMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  reactions: string[];
  onReactionSelect: (emoji: string) => void;
  onPlusClick: (e: React.MouseEvent) => void;
}

export const ReactionMenu = forwardRef<HTMLDivElement, ReactionMenuProps>(
  ({ reactions, onReactionSelect, onPlusClick, className, ...props }, ref) => {
    const { t } = useTranslation();

    // Helper to find the translation key for an emoji
    function getEmojiKey(emoji: string): string | undefined {
      for (const category of Object.values(EMOJI_DATA)) {
        const found = category.find((e) => e.c === emoji);
        if (found) return found.k;
      }
      return undefined;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-opaque/80 backdrop-blur-md rounded-full px-2 py-2 flex items-center gap-1 shadow-lg border border-surface-border cursor-default z-50 select-none",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {reactions.map((emoji, i) => {
          const key = getEmojiKey(emoji);
          const label = key ? t(`Emojis.names.${key}`) : emoji;
          return (
            <Tooltip key={i} content={label} side="top">
              <button
                className="relative w-11 h-11 rounded-full hover:bg-foreground/10 transition-all hover:scale-110 cursor-pointer text-[33px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onReactionSelect(emoji);
                }}
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
              </button>
            </Tooltip>
          );
        })}
        <div className="w-px h-8 bg-surface-border mx-1" />
        <Tooltip
          content={t("Emojis.adjust_reactions") || "Adjust reactions"}
          side="top"
        >
          <button
            className="relative w-11 h-11 rounded-full hover:bg-foreground/10 transition-all hover:scale-110 cursor-pointer group/plus"
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick(e);
            }}
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
                transform: "translateY(-3px)",
              }}
              className="text-3xl text-foreground-40 group-hover/plus:text-foreground transition-all group-hover/plus:scale-110"
            >
              +
            </span>
          </button>
        </Tooltip>
      </div>
    );
  },
);
ReactionMenu.displayName = "ReactionMenu";
