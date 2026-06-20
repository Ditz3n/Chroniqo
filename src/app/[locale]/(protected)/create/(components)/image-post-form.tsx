// src/app/[locale]/(protected)/create/(components)/image-post-form.tsx
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
import { cn } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImagePostFormProps {
  title: string;
  setTitle: (t: string) => void;
  metadata: Record<string, unknown> | null;
  setMetadata: (meta: Record<string, unknown>) => void;
  content: string;
  setContent: (c: string) => void;
}

const MAX_IMAGES = 4;

const uploadFileToBlob = async (file: File | Blob, fileName: string) => {
  const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
  const finalName = `posts/${Date.now()}-${cleanName}`;

  const newBlob = await upload(finalName, file, {
    access: "public",
    handleUploadUrl: "/api/posts/upload-media",
  });
  return newBlob.url;
};

// Compresses image to a Blob locally
const compressImageToBlob = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1600;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas to Blob failed"));
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function ImagePostForm({
  title,
  setTitle,
  content,
  setContent,
  metadata,
  setMetadata,
}: ImagePostFormProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<string[]>(
    (metadata?.images as string[]) || [],
  );
  const [index, setIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const totalSlides =
    images.length < MAX_IMAGES ? images.length + 1 : images.length;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);

    try {
      const availableSlots = MAX_IMAGES - images.length;
      const filesToProcess = files.slice(0, availableSlots);

      // Compress and upload via Direct Client Uploads in parallel
      const uploadPromises = filesToProcess.map(async (file) => {
        const compressedBlob = await compressImageToBlob(file);
        return uploadFileToBlob(
          compressedBlob,
          file.name.replace(/\.[^/.]+$/, ".jpg"),
        );
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      const updatedImages = [...images, ...uploadedUrls];
      setImages(updatedImages);
      setMetadata({ images: updatedImages });
      setIndex(images.length);
    } catch (error) {
      console.error("Failed to upload images:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idxToRemove: number) => {
    const newImages = images.filter((_, i) => i !== idxToRemove);
    setImages(newImages);
    setMetadata({ images: newImages });

    if (index >= newImages.length) {
      setIndex(
        Math.max(0, newImages.length - (newImages.length < MAX_IMAGES ? 0 : 1)),
      );
    }
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

  const isAddSlide = index === images.length && images.length < MAX_IMAGES;
  const currentSrc = !isAddSlide ? images[index] : null;

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

      <div className="p-4 bg-background">
        <div
          className={cn(
            "relative aspect-video rounded-xl overflow-hidden group transition-colors",
            isAddSlide
              ? "bg-transparent"
              : "bg-black border border-surface-border",
          )}
        >
          {isAddSlide ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-border rounded-xl text-foreground-40 hover:bg-foreground/5 hover:border-brand/50 hover:text-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <ImagePlus className="h-8 w-8" />
              )}
              <span className="text-sm font-semibold flex flex-col items-center gap-1">
                {isUploading
                  ? t("createPost.uploading_media")
                  : images.length === 0
                    ? t("createPost.upload_images")
                    : t("createPost.add_more_images")}
                {!isUploading && (
                  <span className="text-xs font-normal text-foreground-40">
                    ({images.length} / {MAX_IMAGES})
                  </span>
                )}
              </span>
            </button>
          ) : (
            <>
              {/* Blurred background fill */}
              <div
                className="absolute inset-0 scale-110 blur-xl brightness-50 bg-cover bg-center transition-all"
                style={{ backgroundImage: `url(${currentSrc})` }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSrc!}
                alt=""
                className="absolute inset-0 w-full h-full object-contain z-10 transition-all"
              />

              <button
                onClick={() => removeImage(index)}
                className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}

          {totalSlides > 1 && (
            <>
              <div className="absolute top-3 left-3 z-20 bg-black/60 rounded-full px-2.5 py-1 text-xs font-bold text-white">
                {index + 1} / {totalSlides}
              </div>

              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-0 hover:bg-black/80 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={() =>
                  setIndex((i) => Math.min(totalSlides - 1, i + 1))
                }
                disabled={index === totalSlides - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-0 hover:bg-black/80 transition-all cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "rounded-full transition-all cursor-pointer",
                      i === index
                        ? "w-4 h-2 bg-white"
                        : "w-2 h-2 bg-white/50 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageChange}
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
