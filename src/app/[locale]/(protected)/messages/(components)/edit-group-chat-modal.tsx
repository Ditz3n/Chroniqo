// src/app/[locale]/(protected)/messages/(components)/edit-group-chat-modal.tsx
"use client";

import { ChatAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPickerModal } from "@/components/ui/icon-picker-modal";
import { ImageCropperModal } from "@/components/ui/image-cropper-modal";
import { ImageOrIconDialog } from "@/components/ui/image-or-icon-dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { EditGroupChatModalProps } from "@/types/app-types";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { useSWRConfig } from "swr";

export function EditGroupChatModal({
  isOpen,
  onClose,
  chatId,
  currentName,
  currentImage,
  currentAvatarEmoji,
  currentAvatarBgColor,
  participants,
  onSuccess,
}: EditGroupChatModalProps & {
  currentAvatarEmoji?: string | null;
  currentAvatarBgColor?: string | null;
}) {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();

  // Track open/close to reset state
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCleared, setImageCleared] = useState(false);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [avatarBgColor, setAvatarBgColor] = useState<string | null>(null);

  // Track if user explicitly cleared the icon
  const [iconCleared, setIconCleared] = useState(false);
  const avatarEmojiRef = useRef<string | null>(null);
  const avatarBgColorRef = useRef<string | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  // Reset state when modal opens
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setName(currentName || "");
    setImagePreview(currentImage);
    setBase64Image(null);
    setAvatarEmoji(currentAvatarEmoji ?? null);
    setAvatarBgColor(currentAvatarBgColor ?? null);
    avatarEmojiRef.current = currentAvatarEmoji ?? null;
    avatarBgColorRef.current = currentAvatarBgColor ?? null;
    setCropSrc(null);
    setIsCropping(false);
    setError(null);
    setImageCleared(false);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  // Handler for image upload from dialog
  const handleAvatarImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setIsCropping(true);
    setAvatarDialogOpen(false);
  };

  // Handler for icon pick from dialog
  const handleAvatarIconPick = () => {
    setIsIconPickerOpen(true);
    setAvatarDialogOpen(false);
  };

  // When icon is picked, update preview immediately
  const handleIconPickerConfirm = (emoji: string | null, bgColor: string) => {
    setAvatarEmoji(emoji);
    setAvatarBgColor(bgColor);
    avatarEmojiRef.current = emoji;
    avatarBgColorRef.current = bgColor;
    setIconCleared(!emoji && !bgColor); // If both are falsy, treat as cleared
    // Clear uploaded image when icon is chosen
    setImagePreview(null);
    setBase64Image(null);
    setIsIconPickerOpen(false);
    setImageCleared(false);
  };

  // Handler for remove action from dialog
  // Remove both image and icon/avatar state
  const handleRemoveAvatarDialog = () => {
    setImagePreview(null);
    setBase64Image(null);
    setCropSrc(null);
    setIsCropping(false);
    setAvatarEmoji(null);
    setAvatarBgColor(null);
    avatarEmojiRef.current = null;
    avatarBgColorRef.current = null;
    setIconCleared(true);
    setImageCleared(true);
    setAvatarDialogOpen(false);
  };

  const handleCropComplete = (blob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setBase64Image(b64);
      setImagePreview(b64);
      setCropSrc(null);
      setIsCropping(false);
      // Reset icon if a real image is chosen
      setAvatarEmoji(null);
      setAvatarBgColor(null);
      avatarEmojiRef.current = null;
      avatarBgColorRef.current = null;
    };
    reader.readAsDataURL(blob);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Always send all fields to backend
    const trimmedName = name.trim();
    const payload = {
      name: trimmedName === "" ? null : trimmedName,
      avatarEmoji: iconCleared ? null : avatarEmojiRef.current,
      avatarBgColor: iconCleared ? null : avatarBgColorRef.current,
      image:
        base64Image !== null
          ? base64Image
          : imagePreview === null
            ? null
            : undefined,
    };

    try {
      const res = await fetch(`/api/conversations/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update group");

      mutate(
        (key) => typeof key === "string" && key.includes("/api/conversations"),
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen && !isCropping}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border">
          <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
            <DialogTitle className="font-bold text-foreground">
              {t("MessagesPage.edit_group")}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="pt-5 px-6 pb-6 flex flex-col gap-5">
            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl">
                {error}
              </div>
            )}

            <div className="flex flex-col items-center mt-2">
              <div className="relative">
                {imagePreview ? (
                  <ChatAvatar
                    participants={participants}
                    chatImage={imagePreview}
                    className="h-24 w-24 border border-surface-border bg-background"
                    emojiSizeClass="text-5xl"
                  />
                ) : avatarBgColor ? (
                  <ChatAvatar
                    participants={participants}
                    avatarBgColor={avatarBgColor}
                    avatarEmoji={avatarEmoji}
                    className="h-24 w-24 border border-surface-border bg-background"
                    emojiSizeClass="text-5xl"
                  />
                ) : !imageCleared && currentImage ? (
                  <ChatAvatar
                    participants={participants}
                    chatImage={currentImage}
                    className="h-24 w-24 border border-surface-border bg-background"
                    emojiSizeClass="text-5xl"
                  />
                ) : iconCleared ? (
                  <ChatAvatar
                    participants={participants}
                    className="h-24 w-24 border border-surface-border bg-background"
                    emojiSizeClass="text-5xl"
                  />
                ) : currentAvatarEmoji && currentAvatarBgColor ? (
                  <ChatAvatar
                    participants={participants}
                    avatarEmoji={currentAvatarEmoji}
                    avatarBgColor={currentAvatarBgColor}
                    className="h-24 w-24 border border-surface-border bg-background"
                    emojiSizeClass="text-5xl"
                  />
                ) : (
                  <ChatAvatar
                    participants={participants}
                    className="h-24 w-24 border border-surface-border bg-background"
                    emojiSizeClass="text-5xl"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setAvatarDialogOpen(true)}
                  className="absolute bottom-0 right-0 bg-surface-opaque border-2 border-surface-border rounded-full p-2 text-foreground-60 hover:text-foreground hover:bg-surface-hover transition-colors shadow-sm cursor-pointer z-10"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              {(imagePreview || avatarBgColor || avatarEmoji) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatarDialog}
                  className="text-sm font-semibold text-brand hover:underline p-2 cursor-pointer mt-2"
                >
                  {t("MessagesPage.remove_avatar")}
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                <input
                  id="group-name"
                  type="text"
                  placeholder=" "
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all"
                />
                <label
                  htmlFor="group-name"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
                >
                  {t("MessagesPage.group_name")}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 -mx-6 -mb-6 px-6 py-4 border-t border-surface-border bg-surface mt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="text-foreground-60 hover:text-foreground hover:bg-transparent"
                >
                  {t("MessagesPage.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "..." : t("MessagesPage.save_nickname")}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Avatar selection dialog now handled by ImageOrIconDialog */}
      <ImageOrIconDialog
        open={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        title={t("MessagesPage.group_avatar")}
        onImageSelect={handleAvatarImageSelect}
        onIconPick={handleAvatarIconPick}
        showRemove={!!imagePreview || !!avatarBgColor || !!avatarEmoji}
        onRemove={handleRemoveAvatarDialog}
        removeLabel={t("MessagesPage.remove_avatar")}
        uploadLabel={t("profile.upload_image")}
        pickIconLabel={t("profile.choose_icon_color")}
      />

      {cropSrc && (
        <ImageCropperModal
          isOpen={isCropping}
          onClose={() => {
            setCropSrc(null);
            setIsCropping(false);
          }}
          imageSrc={cropSrc}
          shape="round"
          aspectRatio={1}
          onCropComplete={handleCropComplete}
        />
      )}

      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentEmoji={avatarEmoji}
        currentBgColor={avatarBgColor}
        previewShape="round"
        onConfirm={handleIconPickerConfirm}
        title={t("MessagesPage.group_avatar")}
      />
    </>
  );
}
