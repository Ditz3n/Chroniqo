// src/app/[locale]/(protected)/(components)/comments/comment-form.tsx
"use client";

import { AddLinkModal } from "@/components/ui/add-link-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cacheKeys } from "@/lib/cache-keys";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CommentFormProps } from "@/types/app-types";
import { ChevronDown, Ghost, HelpCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

export function CommentForm({
  postId,
  parentId,
  onSuccess,
  onCancel,
  autoFocus,
  communityId,
  editCommentId,
  initialContent,
}: CommentFormProps) {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const { data: session } = useSession();

  const { data: muteData } = useSWR<{
    isMuted: boolean;
    expiresAt: string | null;
  }>(
    "/api/user/mute-status",
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60_000 },
  );
  const isMuted = muteData?.isMuted ?? false;

  // Initialise with existing content when in edit mode
  const [content, setContent] = useState(initialContent ?? "");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isMarkdownMode, setIsMarkdownMode] = useState(true);

  // Modals state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Link management states
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [linkModalData, setLinkModalData] = useState({ text: "", url: "" });
  const [linkDropdownData, setLinkDropdownData] = useState<{
    text: string;
    url: string;
    rect: DOMRect;
    element: HTMLAnchorElement;
  } | null>(null);

  // Table management states
  const [tableMenuData, setTableMenuData] = useState<{
    cell: HTMLTableCellElement;
    trigger: HTMLElement;
  } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!editCommentId;

  const userInitial =
    session?.user?.name?.charAt(0)?.toUpperCase() ||
    session?.user?.email?.charAt(0)?.toUpperCase() ||
    "?";

  const updateActiveFormats = useCallback(() => {
    if (isMuted) {
      setActiveFormats(new Set());
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      setActiveFormats(new Set());
      return;
    }

    const anchorNode = selection.anchorNode;
    const anchorElement =
      anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode?.parentElement;

    if (!anchorElement || !editorRef.current.contains(anchorElement)) {
      setActiveFormats(new Set());
      return;
    }

    setActiveFormats(getActiveFormats());
  }, [isMuted]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () =>
      document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  useEffect(() => {
    if (!autoFocus || !editorRef.current || isMuted) return;

    const focusTimeout = setTimeout(() => {
      if (!isMuted) editorRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimeout);
  }, [autoFocus, isMuted]);

  useEffect(() => {
    if (!isMuted || !editorRef.current) return;

    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && editorRef.current.contains(activeElement)) {
      activeElement.blur();
      window.getSelection()?.removeAllRanges();
    }

    setActiveFormats(new Set());
  }, [isMuted]);

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

  const handleSubmit = async () => {
    if (isMuted || !content.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        // Edit mode - PATCH the existing comment
        const res = await fetch(`/api/comments/${editCommentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to edit comment");
        }
      } else {
        // Create mode - POST a new comment
        const res = await fetch(`/api/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, parentId, isAnonymous }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to post comment");
        }

        setContent("");
        setIsAnonymous(false);
      }

      // Revalidate the post's comment list
      mutate(
        (key) =>
          typeof key === "string" &&
          cacheKeys.posts.isPostCommentKey(key) &&
          key.includes(`/api/posts/${postId}`),
        undefined,
        { revalidate: true },
      );

      // Revalidate the isolated thread view for replies
      if (parentId) {
        mutate(
          (key) =>
            typeof key === "string" &&
            cacheKeys.comments.matchesCommentId(key, parentId),
          undefined,
          { revalidate: true },
        );
      }

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const isOfflineError =
        err instanceof TypeError ||
        (err instanceof Error &&
          /failed to fetch|networkerror|load failed/i.test(err.message));

      if (isOfflineError) {
        setError(t("post.comment_submit_offline_error"));
      } else {
        setError(err instanceof Error ? err.message : t("post.comments_error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-0 bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
      {error && (
        <div className="p-3 text-sm text-white bg-brand font-medium">
          {error}
        </div>
      )}

      {/* Editor Area */}
      <div className="min-h-[120px] cursor-text bg-background relative">
        <RichTextEditor
          ref={editorRef}
          value={content}
          onChange={setContent}
          placeholder={t("post.comment_placeholder")}
          className={`min-h-[120px] p-4 text-sm ${
            isMuted ? "pointer-events-none select-none" : ""
          }`}
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

        {isMuted && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/75 backdrop-blur-[1px] px-6 text-center"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
          >
            <div>
              <p className="text-sm font-bold text-warning">
                {t("post.comment_muted_title")}
              </p>
              <p className="mt-1 text-xs text-warning/80">
                {t("post.comment_muted_desc")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar & Actions */}
      <div className="flex flex-wrap items-center justify-between px-2 py-2 border-t border-surface-border bg-surface flex-shrink-0 gap-2">
        <div
          className={`flex items-center gap-1 ${
            isMuted ? "pointer-events-none opacity-50" : ""
          }`}
        >
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
              <HelpCircle className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 pr-2">
          {/* Anonymous toggle is hidden in edit mode - anonymity cannot be changed retroactively */}
          {communityId && !isMuted && !isEditMode && (
            <DropdownMenu>
              <Tooltip
                content={
                  isAnonymous
                    ? t("post.post_as_anonymous_tooltip")
                    : t("post.post_as_yourself_tooltip")
                }
                side="top"
              >
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-surface-border bg-surface hover:bg-foreground/8 text-foreground-60 hover:text-foreground text-sm font-semibold transition-all cursor-pointer focus:outline-none data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground">
                    {isAnonymous ? (
                      <Ghost className="h-4 w-4 text-[var(--color-dailystatus-exhausted)]" />
                    ) : (
                      <Avatar className="h-5 w-5 bg-background">
                        {session?.user?.image && (
                          <AvatarImage src={session.user.image} />
                        )}
                        {!session?.user?.image &&
                        session?.user?.avatarBgColor ? (
                          <IconAvatar
                            emoji={session.user.avatarEmoji}
                            bgColor={session.user.avatarBgColor}
                            emojiSizeClass="text-[8px]"
                          />
                        ) : (
                          <AvatarFallback className="text-[8px] font-bold bg-surface text-foreground">
                            {userInitial}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    <span>
                      {isAnonymous
                        ? t("post.post_as_anonymous")
                        : t("post.post_as_yourself")}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0"
              >
                <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
                  {t("post.post_as")}
                </DropdownMenuLabel>
                <Tooltip
                  content={t("post.post_as_yourself_tooltip")}
                  side="left"
                >
                  <DropdownMenuItem
                    onClick={() => setIsAnonymous(false)}
                    className={cn(
                      "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5",
                      !isAnonymous && "text-foreground bg-foreground/5",
                    )}
                  >
                    <Avatar className="h-5 w-5 mr-2.5 flex-shrink-0 bg-background">
                      {session?.user?.image ? (
                        <AvatarImage src={session.user.image} />
                      ) : session?.user?.avatarBgColor ? (
                        <IconAvatar
                          emoji={session.user.avatarEmoji}
                          bgColor={session.user.avatarBgColor}
                          emojiSizeClass="text-[8px]"
                        />
                      ) : (
                        <AvatarFallback className="text-[8px] font-bold bg-surface text-foreground">
                          {userInitial}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {t("post.post_as_yourself")}
                  </DropdownMenuItem>
                </Tooltip>
                <Tooltip
                  content={t("post.post_as_anonymous_tooltip")}
                  side="left"
                >
                  <DropdownMenuItem
                    onClick={() => setIsAnonymous(true)}
                    className={cn(
                      "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5",
                      isAnonymous && "text-foreground bg-foreground/5",
                    )}
                  >
                    <Ghost className="h-4 w-4 mr-2.5 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110 text-[var(--color-dailystatus-exhausted)]" />
                    {t("post.post_as_anonymous")}
                  </DropdownMenuItem>
                </Tooltip>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 text-xs px-4"
              disabled={isSubmitting}
            >
              {t("communityPage.cancel")}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isMuted || isSubmitting || !content.trim()}
            className="h-8 text-xs px-5 rounded-full"
          >
            {isSubmitting
              ? "..."
              : isEditMode
                ? t("post.save_edit")
                : t("post.reply")}
          </Button>
        </div>
      </div>

      {/* Modals */}
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
