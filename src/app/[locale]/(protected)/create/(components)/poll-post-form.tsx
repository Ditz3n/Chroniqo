// src/app/[locale]/(protected)/create/(components)/poll-post-form.tsx
"use client";

import { AddLinkModal } from "@/components/ui/add-link-modal";
import { Button } from "@/components/ui/button";
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
import {
  POLL_OPTION_TEXT_MAX,
  POLL_OPTIONS_MAX,
  POLL_OPTIONS_MIN,
} from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { PollFormOption, PollPostFormProps } from "@/types/app-types";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function createOptionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PollPostForm({
  title,
  setTitle,
  content,
  setContent,
  metadata,
  setMetadata,
}: PollPostFormProps) {
  const { t } = useTranslation();

  // Initialize state from existing metadata (e.g., if a draft was loaded)
  const initialOptions = metadata?.options as PollFormOption[] | undefined;
  const initialDuration = metadata?.durationHours as number | undefined;

  const [options, setOptions] = useState<PollFormOption[]>(
    initialOptions || [
      { id: createOptionId(), text: "" },
      { id: createOptionId(), text: "" },
    ],
  );

  const [durationHours, setDurationHours] = useState<number>(
    initialDuration || 24,
  );

  // Sync state explicitly to avoid useEffect rendering loops
  const syncMetadata = (opts: PollFormOption[], hours: number) => {
    const validOptions = opts
      .map((o) => ({ id: o.id, text: o.text.trim() }))
      .filter((o) => o.text !== "");
    setMetadata({ options: validOptions, durationHours: hours });
  };

  const addOption = () => {
    if (options.length >= POLL_OPTIONS_MAX) return;
    const newOpts = [...options, { id: createOptionId(), text: "" }];
    setOptions(newOpts);
    syncMetadata(newOpts, durationHours);
  };

  const removeOption = (id: string) => {
    if (options.length <= POLL_OPTIONS_MIN) return;
    const newOpts = options.filter((o) => o.id !== id);
    setOptions(newOpts);
    syncMetadata(newOpts, durationHours);
  };

  const updateOption = (id: string, text: string) => {
    const newOpts = options.map((o) => (o.id === id ? { ...o, text } : o));
    setOptions(newOpts);
    syncMetadata(newOpts, durationHours);
  };

  const updateDuration = (hours: number) => {
    setDurationHours(hours);
    syncMetadata(options, hours);
  };

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
      <div className="p-4 border-b border-surface-border">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("createPost.poll_question")}
          className="w-full bg-transparent text-lg font-bold font-heading text-foreground outline-none placeholder:text-foreground-40"
          maxLength={300}
        />
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground-40">
            {t("createPost.poll_options")}
          </label>

          {options.map((opt, i) => (
            <div
              key={opt.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1",
                i === 0 && "mt-6",
              )}
            >
              <div className="min-w-0">
                <div className="relative rounded-xl bg-background">
                  <input
                    id={`poll-option-${opt.id}`}
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder=" "
                    maxLength={POLL_OPTION_TEXT_MAX}
                    className="notched-input peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-sm text-foreground focus:outline-none relative z-[1]"
                  />
                  <label
                    htmlFor={`poll-option-${opt.id}`}
                    className="floating-label"
                  >
                    {t("createPost.poll_option_label").replace(
                      "{{index}}",
                      String(i + 1),
                    )}
                  </label>
                  <fieldset className="notched-outline" aria-hidden="true">
                    <legend>
                      {t("createPost.poll_option_label").replace(
                        "{{index}}",
                        String(i + 1),
                      )}
                    </legend>
                  </fieldset>
                </div>
              </div>
              <Button
                type="button"
                variant="brand"
                size="icon"
                onClick={() => removeOption(opt.id)}
                disabled={options.length <= POLL_OPTIONS_MIN}
                className="h-11 w-11 self-center"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <span
                className={cn(
                  "text-[11px] text-right",
                  opt.text.length >= POLL_OPTION_TEXT_MAX - 10
                    ? "text-brand"
                    : "text-foreground-40",
                )}
              >
                {t("createPost.poll_option_char_count")
                  .replace("{{current}}", String(opt.text.length))
                  .replace("{{max}}", String(POLL_OPTION_TEXT_MAX))}
              </span>
            </div>
          ))}

          {options.length < POLL_OPTIONS_MAX && (
            <Button
              type="button"
              variant="outline-surface"
              onClick={addOption}
              className="w-fit gap-2 mt-2"
            >
              <Plus className="h-4 w-4" />
              {t("createPost.add_option")}
            </Button>
          )}

          {options.length >= POLL_OPTIONS_MAX && (
            <p className="text-xs font-bold uppercase tracking-wider text-foreground-40 mt-2">
              {t("createPost.poll_options_limit").replace(
                "{{max}}",
                String(POLL_OPTIONS_MAX),
              )}
            </p>
          )}
        </div>

        <div className="border-t border-surface-border pt-6 flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground-40">
            {t("createPost.poll_duration")}
          </label>
          <div className="flex flex-wrap gap-3">
            {[24, 48, 72].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => updateDuration(hours)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 cursor-pointer",
                  durationHours === hours
                    ? "border-brand bg-brand/10 text-foreground"
                    : "border-surface-border bg-background text-foreground-60 hover:text-foreground hover:border-foreground/30",
                )}
              >
                {t(`createPost.duration_${hours}h`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="border-t border-surface-border mt-4">
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
