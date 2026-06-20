// src/components/ui/rich-text-editor/format-toolbar.tsx

"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { FormatToolbarProps } from "@/types/app-types";
import {
  Bold,
  Code,
  EyeOff,
  FileCode,
  Heading,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Superscript,
  Table as TableIcon,
  type LucideIcon,
} from "lucide-react";

export function FormatToolbar({
  onFormatClick,
  activeFormats,
  onSwitchMode,
  isMarkdownMode = false,
  className,
  disabledFormats = new Set(),
  boldDisabled = false,
}: FormatToolbarProps) {
  const { t } = useTranslation();

  // If inside a code block, disable all formatting buttons EXCEPT the codeblock toggle itself
  const inCodeBlock = activeFormats.has("codeblock");
  // If inside a table, disable block-level formats to prevent layout breakage
  const inTable = activeFormats.has("table");

  const formats: {
    key: string;
    icon: LucideIcon;
    label: string;
    disabled?: boolean;
  }[] = [
    {
      key: "bold",
      icon: Bold,
      label: t("richText.format_bold"),
      disabled: boldDisabled || disabledFormats.has("bold") || inCodeBlock,
    },
    {
      key: "italic",
      icon: Italic,
      label: t("richText.format_italic"),
      disabled: disabledFormats.has("italic") || inCodeBlock,
    },
    {
      key: "strikethrough",
      icon: Strikethrough,
      label: t("richText.format_strikethrough"),
      disabled: disabledFormats.has("strikethrough") || inCodeBlock,
    },
    {
      key: "superscript",
      icon: Superscript,
      label: t("richText.format_superscript"),
      disabled: disabledFormats.has("superscript") || inCodeBlock,
    },
    {
      key: "heading",
      icon: Heading,
      label: t("richText.format_heading"),
      disabled: disabledFormats.has("heading") || inCodeBlock || inTable,
    },
    {
      key: "link",
      icon: LinkIcon,
      label: t("richText.format_link"),
      disabled: disabledFormats.has("link") || inCodeBlock,
    },
    {
      key: "bullet",
      icon: List,
      label: t("richText.format_bullet"),
      disabled: disabledFormats.has("bullet") || inCodeBlock || inTable,
    },
    {
      key: "numbered",
      icon: ListOrdered,
      label: t("richText.format_numbered"),
      disabled: disabledFormats.has("numbered") || inCodeBlock || inTable,
    },
    {
      key: "spoiler",
      icon: EyeOff,
      label: t("richText.format_spoiler"),
      disabled: disabledFormats.has("spoiler") || inCodeBlock,
    },
    {
      key: "quote",
      icon: Quote,
      label: t("richText.format_quote"),
      disabled: disabledFormats.has("quote") || inCodeBlock || inTable,
    },
    {
      key: "code",
      icon: Code,
      label: t("richText.format_code"),
      disabled: disabledFormats.has("code") || inCodeBlock,
    },
    {
      key: "codeblock",
      icon: FileCode,
      label: t("richText.format_codeblock"),
      disabled: disabledFormats.has("codeblock") || inTable,
    },
    {
      key: "table",
      icon: TableIcon,
      label: t("richText.format_table"),
      disabled: disabledFormats.has("table") || inCodeBlock || inTable,
    },
  ];

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {formats.map((format) => {
        const Icon = format.icon;
        const isActive = activeFormats.has(format.key);

        return (
          <Tooltip key={format.key} content={format.label} side="top">
            <button
              type="button"
              onClick={() => onFormatClick(format.key)}
              disabled={isMarkdownMode || format.disabled}
              aria-label={format.label}
              className={cn(
                "p-2 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                isActive && "bg-foreground/10 text-brand",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          </Tooltip>
        );
      })}
      {onSwitchMode && (
        <Tooltip
          content={isMarkdownMode ? "Switch to Editor" : "Switch to Markdown"}
          side="top"
        >
          <button
            type="button"
            onClick={onSwitchMode}
            aria-label={
              isMarkdownMode ? "Switch to Editor" : "Switch to Markdown"
            }
            className={cn(
              "ml-auto p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer",
              !isMarkdownMode
                ? "bg-foreground/10 text-brand"
                : "hover:bg-foreground/10 text-foreground-60",
            )}
          >
            {isMarkdownMode ? "Editor" : "Markdown"}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
