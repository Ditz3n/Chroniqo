// src/app/[locale]/(protected)/create/(components)/youtube-post-form.tsx
"use client";

import { AddLinkModal } from "@/components/ui/add-link-modal";
import { LinkDropdown } from "@/components/ui/link-dropdown";
import { MarkdownHelpModal } from "@/components/ui/markdown-help-modal";
import {
  alignColumn,
  applyFormat,
  deleteColumn,
  deleteRow,
  deleteTable,
  FormatToolbar,
  getActiveFormats,
  insertColumn,
  insertRow,
  RichTextEditor,
} from "@/components/ui/rich-text-editor";
import { TableContextMenu } from "@/components/ui/table-context-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface YoutubePostFormProps {
  title: string;
  setTitle: (t: string) => void;
  metadata: Record<string, unknown> | null;
  setMetadata: (meta: Record<string, unknown>) => void;
  content: string;
  setContent: (c: string) => void;
}

export function YoutubePostForm({
  title,
  setTitle,
  content,
  setContent,
  metadata,
  setMetadata,
}: YoutubePostFormProps) {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(
    (metadata?.videoId as string) || null,
  );

  // Editor states
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isMarkdownMode, setIsMarkdownMode] = useState(true);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [linkModalData, setLinkModalData] = useState({ text: "", url: "" });
  const [linkDropdownData, setLinkDropdownData] = useState<{
    text: string;
    url: string;
    rect: DOMRect;
    element: HTMLAnchorElement;
  } | null>(null);
  const [tableMenuData, setTableMenuData] = useState<{
    cell: HTMLTableCellElement;
    trigger: HTMLElement;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    const match = val.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
    );
    if (match && match[1]) {
      setVideoId(match[1]);
      setMetadata({ videoId: match[1] });
    } else {
      setVideoId(null);
    }
  };

  const updateActiveFormats = useCallback(() => {
    setActiveFormats(getActiveFormats());
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () =>
      document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  const handleFormatClick = (format: string) => {
    if (format === "link") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        setSavedRange(selection.getRangeAt(0).cloneRange());
        setLinkModalData({ text: selection.toString(), url: "" });
      } else {
        setLinkModalData({ text: "", url: "" });
      }
      setIsLinkModalOpen(true);
    } else {
      applyFormat(format);
      updateActiveFormats();
    }
  };

  const handleLinkClick = (link: HTMLAnchorElement) => {
    setLinkDropdownData({
      text: link.textContent || "",
      url: link.href,
      rect: link.getBoundingClientRect(),
      element: link,
    });
  };

  const handleTableCellClick = (
    cell: HTMLTableCellElement,
    trigger: HTMLElement,
  ) => {
    setTableMenuData({ cell, trigger });
  };

  const handleEditLink = () => {
    if (!linkDropdownData) return;
    const el = linkDropdownData.element;
    const range = document.createRange();
    range.selectNode(el);
    setSavedRange(range);
    setLinkModalData({ text: el.textContent || "", url: el.href });
    setLinkDropdownData(null);
    setIsLinkModalOpen(true);
  };

  const handleDeleteLink = () => {
    if (!linkDropdownData) return;
    const el = linkDropdownData.element;
    const textNode = document.createTextNode(el.textContent || "");
    el.replaceWith(textNode);
    setLinkDropdownData(null);
    editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    updateActiveFormats();
  };

  const handleSaveLink = (text: string, url: string) => {
    if (savedRange) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
      applyFormat("link", { text, url });
      updateActiveFormats();
    }
    setIsLinkModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-surface-border flex flex-col gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("createPost.title_placeholder")}
          className="w-full bg-transparent text-lg font-bold font-heading text-foreground outline-none placeholder:text-foreground-40"
          maxLength={300}
        />
        <div className="relative">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={t("createPost.youtube_url_placeholder")}
            className="w-full bg-background border border-surface-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {videoId && (
        <div className="p-4 bg-background">
          <div className="aspect-video rounded-xl overflow-hidden border border-surface-border">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube preview"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="border-t border-surface-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-foreground/5 flex-shrink-0">
          <FormatToolbar
            activeFormats={activeFormats}
            onFormatClick={handleFormatClick}
            isMarkdownMode={isMarkdownMode}
            onSwitchMode={() => setIsMarkdownMode((prev) => !prev)}
            className="text-foreground-60"
          />
          <Tooltip content={t("richText.markdown_help")} side="top">
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              aria-label={t("richText.markdown_help")}
              className="p-2 text-foreground-40 hover:text-foreground transition-colors rounded-full hover:bg-foreground/10 cursor-pointer"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 min-h-[200px] cursor-text bg-background relative">
          <RichTextEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            placeholder={t("createPost.body_placeholder_optional")}
            className="min-h-[200px] p-4 text-base"
            isMarkdownMode={isMarkdownMode}
            onLinkClick={handleLinkClick}
            onTableCellClick={handleTableCellClick}
          />

          {linkDropdownData && (
            <div
              style={{
                position: "fixed",
                top: linkDropdownData.rect.top,
                left: linkDropdownData.rect.left,
                width: linkDropdownData.rect.width,
                height: linkDropdownData.rect.height,
                zIndex: -1,
              }}
            >
              <LinkDropdown
                url={linkDropdownData.url}
                text={linkDropdownData.text}
                isOpen={!!linkDropdownData}
                onOpenChange={(open) => !open && setLinkDropdownData(null)}
                onEdit={handleEditLink}
                onDelete={handleDeleteLink}
              >
                <div className="w-full h-full" />
              </LinkDropdown>
            </div>
          )}

          <TableContextMenu
            isOpen={!!tableMenuData}
            onOpenChange={(open) => !open && setTableMenuData(null)}
            triggerElement={tableMenuData?.trigger || null}
            onInsertRowAbove={() => {
              if (tableMenuData) insertRow(tableMenuData.cell, "above");
              setTableMenuData(null);
            }}
            onInsertRowBelow={() => {
              if (tableMenuData) insertRow(tableMenuData.cell, "below");
              setTableMenuData(null);
            }}
            onDeleteRow={() => {
              if (tableMenuData) deleteRow(tableMenuData.cell);
              setTableMenuData(null);
            }}
            onInsertColumnBefore={() => {
              if (tableMenuData) insertColumn(tableMenuData.cell, "left");
              setTableMenuData(null);
            }}
            onInsertColumnAfter={() => {
              if (tableMenuData) insertColumn(tableMenuData.cell, "right");
              setTableMenuData(null);
            }}
            onDeleteColumn={() => {
              if (tableMenuData) deleteColumn(tableMenuData.cell);
              setTableMenuData(null);
            }}
            onAlignLeft={() => {
              if (tableMenuData) alignColumn(tableMenuData.cell, "left");
              setTableMenuData(null);
            }}
            onAlignCenter={() => {
              if (tableMenuData) alignColumn(tableMenuData.cell, "center");
              setTableMenuData(null);
            }}
            onAlignRight={() => {
              if (tableMenuData) alignColumn(tableMenuData.cell, "right");
              setTableMenuData(null);
            }}
            onDeleteTable={() => {
              if (tableMenuData) deleteTable(tableMenuData.cell);
              setTableMenuData(null);
            }}
          />
        </div>
      </div>

      <AddLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSave={handleSaveLink}
        initialText={linkModalData.text}
        initialUrl={linkModalData.url}
      />
      <MarkdownHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
