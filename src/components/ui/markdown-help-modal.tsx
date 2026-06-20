// src/components/ui/markdown-help-modal.tsx
"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { MarkdownHelpModalProps } from "@/types/app-types";
import { Spoiler } from "./spoiler";

export function MarkdownHelpModal({ isOpen, onClose }: MarkdownHelpModalProps) {
  const { t } = useTranslation();
  const markdownItem = t("richText.markdown_example_item");
  const markdownQuote = t("richText.markdown_example_quoted_text");
  const markdownSuper = t("richText.markdown_example_super");
  const markdownScript = t("richText.markdown_example_script");
  const markdownSpoiler = t("richText.markdown_example_spoiler");
  const markdownLinkText = t("richText.markdown_example_link_text");

  const rows = [
    {
      col1: `*${t("richText.italics")}*`,
      col2: t("richText.italics"),
      style: "italic",
    },
    {
      col1: `**${t("richText.bold")}**`,
      col2: t("richText.bold"),
      style: "font-bold",
    },
    {
      col1: `[${markdownLinkText}](https://chroniqo.com)`,
      col2: (
        <a
          href="https://chroniqo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline hover:text-brand/80 transition-colors"
        >
          {markdownLinkText}
        </a>
      ),
      style: "",
    },
    {
      col1: `* ${markdownItem} 1\n* ${markdownItem} 2\n* ${markdownItem} 3`,
      col2: `• ${markdownItem} 1\n• ${markdownItem} 2\n• ${markdownItem} 3`,
      style: "",
    },
    {
      col1: `> ${markdownQuote}`,
      col2: (
        <div className="border-l-4 border-foreground-40 pl-2 text-foreground-60 font-medium">
          {markdownQuote}
        </div>
      ),
      style: "",
    },
    {
      col1: `${markdownSuper}^${markdownScript}`,
      col2: (
        <span>
          {markdownSuper}
          <sup>{markdownScript}</sup>
        </span>
      ),
      style: "",
    },
    {
      col1: `>!${markdownSpoiler}!<`,
      col2: <Spoiler>{markdownSpoiler}</Spoiler>,
      style: "",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background p-0 overflow-hidden gap-0 max-h-[90vh] max-w-lg">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold">
            {t("richText.markdown_help")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="p-2">
            <p className="text-sm text-foreground-60 font-medium mb-6">
              {t("richText.markdown_help_desc")}
            </p>
            <div className="border border-surface-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 bg-foreground/5 border-b border-surface-border">
                <div className="p-3 text-sm font-bold border-r border-surface-border text-foreground-60 uppercase tracking-wider">
                  {t("richText.type_this")}
                </div>
                <div className="p-3 text-sm font-bold text-foreground-60 uppercase tracking-wider">
                  {t("richText.to_get_this")}
                </div>
              </div>
              <div className="divide-y divide-surface-border bg-background">
                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2">
                    <div className="p-3 text-sm font-mono text-foreground-60 border-r border-surface-border whitespace-pre-wrap">
                      {row.col1}
                    </div>
                    <div
                      className={cn(
                        "p-3 text-sm font-medium text-foreground whitespace-pre-wrap",
                        row.style,
                      )}
                    >
                      {row.col2}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
