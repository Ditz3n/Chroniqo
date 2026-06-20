// src/components/ui/rich-text-editor/rich-text-editor.tsx

"use client";

import { cn } from "@/lib/utils";
import { RichTextEditorProps } from "@/types/app-types";
import React, { useEffect, useRef } from "react";
import { useArrowNavigation } from "./hooks/use-arrow-navigation";
import { useCodeBlockEnter } from "./hooks/use-code-block-enter";
import { useHeadingEnter } from "./hooks/use-heading-enter";
import { useInlineFormatEnter } from "./hooks/use-inline-format-enter";
import { useLinkClick } from "./hooks/use-link-click";
import { useLinkObserver } from "./hooks/use-link-observer";
import { useLinkTyping } from "./hooks/use-link-typing";
import { useListEnter } from "./hooks/use-list-enter";
import { useQuoteEnter } from "./hooks/use-quote-enter";
import { useSelectionSync } from "./hooks/use-selection-sync";
import { useSpoilerTyping } from "./hooks/use-spoiler-typing";
import { useStyleStripper } from "./hooks/use-style-stripper";
import { useTabListIndent } from "./hooks/use-tab-list-indent";
import { useTableCellInput } from "./hooks/use-table-cell-input";
import { useTableEnter } from "./hooks/use-table-enter";
import { useTableMenuClick } from "./hooks/use-table-menu-click";
import { parseHTMLToMarkdown } from "./parse-html-to-markdown";
import { parseMarkdownToHTML } from "./parse-markdown-to-html";

export const RichTextEditor = React.forwardRef<
  HTMLDivElement,
  RichTextEditorProps
>(function RichTextEditor(
  {
    value,
    onChange,
    placeholder,
    className,
    onFocus,
    isMarkdownMode = false,
    onLinkClick,
    onTableCellClick,
    onSelectionChange,
  },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Combine refs
  React.useImperativeHandle(ref, () => editorRef.current!);

  // Sync external value into the editor DOM.
  // Only runs when not focused (avoids clobbering the user's in-progress edits)
  // and not when a table cell is active (table cells manage their own focus).
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      const activeElement = document.activeElement;
      const isInTableCell = activeElement?.closest(".table-cell-content");

      if (!isInTableCell) {
        if (isMarkdownMode) {
          editorRef.current.innerText = value;
        } else {
          editorRef.current.innerHTML = parseMarkdownToHTML(value, true);
        }
      }
    }
  }, [value, isMarkdownMode]);

  // --- Editor behaviour hooks ---
  useSelectionSync(editorRef, onSelectionChange);
  useTableCellInput(editorRef, isMarkdownMode);
  useTableMenuClick(editorRef, isMarkdownMode, onTableCellClick);
  useLinkTyping(editorRef, isMarkdownMode);
  useTabListIndent(editorRef, isMarkdownMode);
  useSpoilerTyping(editorRef, isMarkdownMode);
  useHeadingEnter(editorRef, isMarkdownMode);
  useQuoteEnter(editorRef, isMarkdownMode);
  useCodeBlockEnter(editorRef, isMarkdownMode);
  useTableEnter(editorRef, isMarkdownMode);
  useArrowNavigation(editorRef, isMarkdownMode);
  useListEnter(editorRef, isMarkdownMode);
  useStyleStripper(editorRef, isMarkdownMode, onSelectionChange);
  useInlineFormatEnter(editorRef, isMarkdownMode);
  useLinkClick(editorRef, onLinkClick, onTableCellClick);
  useLinkObserver(editorRef, isMarkdownMode);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (isMarkdownMode) {
      onChange((e.currentTarget as HTMLDivElement).innerText || "");
    } else {
      const html = e.currentTarget.innerHTML;
      const markdown = parseHTMLToMarkdown(html);
      onChange(markdown);
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={() => {
        onFocus?.();
      }}
      onBlur={() => {}}
      data-placeholder={placeholder}
      className={cn(
        "min-h-[60px] w-full rounded-md bg-transparent px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 relative",
        // Force unbroken words to wrap and maintain spacing
        "whitespace-pre-wrap break-words [word-break:break-word]",
        // Editor-specific styling for Spoilers
        "[&_.spoiler-wrapper]:bg-foreground/10 [&_.spoiler-wrapper]:rounded-[3px] [&_.spoiler-wrapper]:px-[2px]",
        // Editor-specific styling for Inline Code
        "[&_.inline-code]:bg-foreground/10 [&_.inline-code]:text-brand [&_.inline-code]:rounded-md [&_.inline-code]:px-1.5 [&_.inline-code]:py-0.5 [&_.inline-code]:font-mono [&_.inline-code]:text-[0.85em]",
        // Editor-specific styling for Code Blocks
        "[&_pre.code-block-editor]:bg-surface-hover [&_pre.code-block-editor]:p-3 [&_pre.code-block-editor]:rounded-xl [&_pre.code-block-editor]:font-mono [&_pre.code-block-editor]:text-sm [&_pre.code-block-editor]:overflow-x-auto [&_pre.code-block-editor]:my-2 [&_pre.code-block-editor]:border [&_pre.code-block-editor]:border-surface-border",
        "[&_pre.code-block-editor_code]:font-mono [&_pre.code-block-editor_code]:block [&_pre.code-block-editor_code]:min-w-full",
        // Editor-specific styling for Tables
        "[&_.editor-table]:table-fixed [&_.editor-table]:w-full [&_.editor-table]:border-collapse [&_.editor-table]:my-4 [&_.editor-table]:text-sm",
        "[&_.editor-table_td]:border [&_.editor-table_td]:border-surface-border [&_.editor-table_td]:p-0 [&_.editor-table_td]:min-w-[100px] [&_.editor-table_td]:relative [&_.editor-table_td]:align-top",
        "[&_.editor-table_tr:nth-child(even)]:bg-foreground/[0.03] [&_.editor-table_tr:nth-child(odd)]:bg-foreground/[0.06]",
        "[&_.editor-table_tr:first-child_td]:font-bold",
        "[&_.table-cell-content]:pl-3 [&_.table-cell-content]:pr-7 [&_.table-cell-content]:py-1.5 [&_.table-cell-content]:min-h-[1.5rem] [&_.table-cell-content]:outline-none [&_.table-cell-content]:break-words [&_.table-cell-content]:whitespace-pre-wrap",
        "[&_.table-cell-menu-container]:absolute [&_.table-cell-menu-container]:right-1 [&_.table-cell-menu-container]:top-1.5 [&_.table-cell-menu-container]:opacity-0 [&_.editor-table_td:focus-within_.table-cell-menu-container]:opacity-100 [&_.table-cell-menu-container]:transition-opacity [&_.table-cell-menu-container]:z-10",
        "[&_.table-cell-menu-button]:flex [&_.table-cell-menu-button]:items-center [&_.table-cell-menu-button]:justify-center [&_.table-cell-menu-button]:h-5 [&_.table-cell-menu-button]:w-5 [&_.table-cell-menu-button]:rounded [&_.table-cell-menu-button]:bg-background [&_.table-cell-menu-button]:border [&_.table-cell-menu-button]:border-surface-border [&_.table-cell-menu-button]:text-foreground-60 hover:[&_.table-cell-menu-button]:text-foreground hover:[&_.table-cell-menu-button]:bg-surface-hover [&_.table-cell-menu-button]:cursor-pointer",
        className,
      )}
    />
  );
});

RichTextEditor.displayName = "RichTextEditor";
