// src/app/[locale]/(protected)/(components)/posts/markdown-renderer.tsx
"use client";

import { parseMarkdownToHTML } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { MarkdownRendererProps } from "@/types/app-types";
import DOMPurify from "isomorphic-dompurify";

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  // Ensure we pass an empty string if content is undefined/null to prevent string method crashes
  const rawHtml = parseMarkdownToHTML(content || "");

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    // Add "style" so inline text-align attributes from the table are not stripped
    ADD_ATTR: ["data-spoiler", "data-link", "target", "rel", "class", "style"],
  });

  return (
    <div
      className={cn(
        "text-sm text-foreground-60 leading-relaxed break-words",
        "[&_a]:text-brand [&_a]:underline [&_a]:cursor-pointer",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-foreground-40 [&_blockquote]:pl-3 [&_blockquote]:my-2",
        "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h1]:text-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
        "[&_pre]:bg-surface [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:my-2 [&_code]:font-mono [&_code]:text-xs",
        "[&_.spoiler-wrapper:not(.revealed)_.spoiler-content]:text-transparent [&_.spoiler-wrapper:not(.revealed)_.spoiler-content]:bg-foreground/20 [&_.spoiler-wrapper:not(.revealed)_.spoiler-content]:hover:bg-foreground/30 [&_.spoiler-wrapper:not(.revealed)]:cursor-pointer [&_.spoiler-wrapper]:rounded-[3px] [&_.spoiler-wrapper]:transition-colors",
        "[&_.spoiler-wrapper.revealed_.spoiler-content]:text-foreground-60 [&_.spoiler-wrapper.revealed_.spoiler-content]:bg-transparent",
        "[&_table]:table-fixed [&_table]:break-words [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm",
        "[&_th]:border [&_th]:border-surface-border [&_th]:p-2.5 [&_th]:bg-foreground/[0.06] [&_th]:font-bold [&_th]:whitespace-pre-wrap [&_th]:align-top",
        "[&_td]:border [&_td]:border-surface-border [&_td]:p-2.5 [&_td]:whitespace-pre-wrap [&_td]:align-top",
        "[&_tr:nth-child(even)_td]:bg-foreground/[0.03]",
        className,
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const spoiler = target.closest(".spoiler-wrapper");
        if (spoiler) {
          spoiler.classList.add("revealed");
        }
      }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
