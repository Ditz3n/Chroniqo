// src/components/ui/emoji-button.tsx
"use client";

import { cn } from "@/lib/utils";
import { getAlignmentStyle } from "@/lib/utils/emoji-utils";
import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmojiPicker } from "./emoji-picker";

type TriggerType = "plus" | "smile" | "custom";

interface EmojiButtonProps {
  onEmojiSelect: (emoji: string) => void;
  triggerType?: TriggerType;
  triggerClassName?: string;
  pickerClassName?: string;
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  placement?: "above" | "below";
  mode?: "input" | "reaction";
  currentReactions?: string[];
  onAdjustReactions?: () => void;
  renderWithTooltip?: (
    trigger: React.ReactNode,
    isOpen: boolean,
  ) => React.ReactNode;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export function EmojiButton({
  onEmojiSelect,
  triggerType = "smile",
  triggerClassName,
  pickerClassName,
  children,
  align = "left",
  placement = "below",
  mode = "input",
  currentReactions,
  onAdjustReactions,
  renderWithTooltip,
  inputRef,
}: EmojiButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isColorHighlighted, setIsColorHighlighted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      requestAnimationFrame(() => {
        if (containerRef.current?.matches(":hover")) {
          setIsHovered(true);
        } else {
          setIsColorHighlighted(false);
        }
      });
    }, 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    if (triggerType !== "smile") handleClose();
  };

  const renderTrigger = () => {
    if (children) {
      return (
        <div
          className={cn("inline-block cursor-pointer", triggerClassName)}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
              handleClose();
            } else {
              setIsOpen(true);
              setIsColorHighlighted(true);
              if (inputRef?.current) inputRef.current.focus();
            }
          }}
        >
          {children}
        </div>
      );
    }

    switch (triggerType) {
      case "plus":
        return (
          <button
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-full transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand active:bg-transparent",
              isHovered && "bg-foreground/10 scale-110",
              triggerClassName,
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isOpen) {
                handleClose();
              } else {
                setIsOpen(true);
                setIsColorHighlighted(true);
                if (inputRef?.current) inputRef.current.focus();
              }
            }}
          >
            <span
              className={cn(
                "text-3xl transition-all",
                isColorHighlighted || isHovered
                  ? "text-foreground"
                  : "text-foreground-40",
              )}
            >
              +
            </span>
          </button>
        );

      case "smile":
        return (
          <button
            className={cn(
              "flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand active:bg-transparent",
              triggerClassName,
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isOpen) {
                handleClose();
              } else {
                setIsOpen(true);
                setIsColorHighlighted(true);
                if (inputRef?.current) inputRef.current.focus();
              }
            }}
          >
            <Smile
              className={cn(
                "h-6 w-6 transition-colors",
                isColorHighlighted || isHovered
                  ? "text-foreground"
                  : "text-foreground-60",
              )}
            />
          </button>
        );
      default:
        return null;
    }
  };

  const trigger = renderTrigger();
  return (
    <div ref={containerRef} className="relative inline-block">
      {renderWithTooltip ? renderWithTooltip(trigger, isOpen) : trigger}
      <div
        ref={pickerRef}
        className={cn(
          "absolute z-[60]",
          placement === "above" ? "bottom-full mb-8" : "mt-2",
          getAlignmentStyle(align),
          isOpen || isClosing
            ? isClosing
              ? "animate-emoji-picker-out pointer-events-auto"
              : "animate-emoji-picker-in pointer-events-auto"
            : "pointer-events-none opacity-0",
          pickerClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(isOpen || isClosing) && (
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={handleClose}
            mode={mode}
            currentReactions={currentReactions}
            onAdjustReactions={onAdjustReactions}
            inputRef={inputRef}
          />
        )}
      </div>
    </div>
  );
}
