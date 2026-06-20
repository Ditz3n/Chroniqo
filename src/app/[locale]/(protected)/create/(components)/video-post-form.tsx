// src/app/[locale]/(protected)/create/(components)/video-post-form.tsx
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
import { upload } from "@vercel/blob/client";
import { HelpCircle, Loader2, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VideoPlayer } from "../../(components)/posts/video-post";

interface VideoPostFormProps {
  title: string;
  setTitle: (t: string) => void;
  metadata: Record<string, unknown> | null;
  setMetadata: (meta: Record<string, unknown>) => void;
  content: string;
  setContent: (c: string) => void;
}

const uploadFileToBlob = async (file: File | Blob, fileName: string) => {
  const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
  const finalName = `posts/${Date.now()}-${cleanName}`;

  const newBlob = await upload(finalName, file, {
    access: "public",
    handleUploadUrl: "/api/posts/upload-media",
  });

  return newBlob.url;
};

const extractVideoData = (
  file: File,
): Promise<{ duration: number; thumbBlob: Blob }> => {
  return new Promise((resolve, reject) => {
    const localUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = localUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, video.duration / 2);
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(localUrl);
          if (blob) {
            resolve({ duration: video.duration, thumbBlob: blob });
          } else {
            reject(new Error("Canvas to Blob failed"));
          }
        },
        "image/jpeg",
        0.8,
      );
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(localUrl);
      reject(new Error("Video load failed"));
    });
  });
};

export function VideoPostForm({
  title,
  setTitle,
  content,
  setContent,
  metadata,
  setMetadata,
}: VideoPostFormProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(
    (metadata?.videoUrl as string) || null,
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    (metadata?.thumbnailUrl as string) || null,
  );
  const [duration, setDuration] = useState<number>(
    (metadata?.duration as number) || 0,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Increased to 50MB since client uploads bypass the server limit
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(t("createPost.video_too_large"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const { duration, thumbBlob } = await extractVideoData(file);

      // Upload directly to Vercel Blob from the browser
      const [uploadedVideoUrl, uploadedThumbUrl] = await Promise.all([
        uploadFileToBlob(file, file.name),
        uploadFileToBlob(thumbBlob, "thumbnail.jpg"),
      ]);

      setVideoUrl(uploadedVideoUrl);
      setThumbnailUrl(uploadedThumbUrl);
      setDuration(duration);
      setMetadata({
        videoUrl: uploadedVideoUrl,
        thumbnailUrl: uploadedThumbUrl,
        duration: duration,
      });
    } catch (error) {
      console.error("Video processing failed:", error);
      setErrorMsg(t("createPost.upload_failed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeVideo = () => {
    setVideoUrl(null);
    setThumbnailUrl(null);
    setDuration(0);
    setMetadata({ videoUrl: null, thumbnailUrl: null, duration: 0 });
    setErrorMsg(null);
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
          placeholder={t("createPost.title_placeholder")}
          className="w-full bg-transparent text-lg font-bold font-heading text-foreground outline-none placeholder:text-foreground-40"
          maxLength={300}
        />
      </div>

      <div className="p-4 bg-background flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 text-sm font-semibold text-white bg-brand rounded-xl">
            {errorMsg}
          </div>
        )}

        {videoUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-surface-border group">
            <VideoPlayer
              videoUrl={videoUrl}
              thumbnailUrl={thumbnailUrl || ""}
              duration={duration}
              spoiler={false}
            />
            <button
              onClick={removeVideo}
              className="absolute top-3 right-3 z-50 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full aspect-video flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-border rounded-xl text-foreground-40 hover:bg-foreground/5 hover:border-brand/50 hover:text-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Video className="h-8 w-8" />
            )}
            <span className="text-sm font-semibold">
              {isUploading
                ? t("createPost.uploading_media")
                : t("createPost.upload_video")}
            </span>
            <span className="text-xs font-normal text-foreground-40">
              {t("createPost.max_video_size")}
            </span>
          </button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          accept="video/*"
          className="hidden"
          onChange={handleVideoChange}
        />
      </div>

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
