// src/app/[locale]/(protected)/communities/[name]/(components)/edit-community-modal.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPickerModal } from "@/components/ui/icon-picker-modal";
import { ImageCropperModal } from "@/components/ui/image-cropper-modal";
import { ImageOrIconDialog } from "@/components/ui/image-or-icon-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ActiveDialog, EditCommunityModalProps } from "@/types/app-types";
import { Camera, Check, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EditRulesModal } from "./edit-rules-modal";

export function EditCommunityModal({
  community,
  isOpen,
  onClose,
  onSuccess,
}: EditCommunityModalProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>("main");
  const [iconPickerTarget, setIconPickerTarget] = useState<
    "avatar" | "header" | null
  >(null);

  const [description, setDescription] = useState(community.description || "");
  const [category, setCategory] = useState(community.category);
  const [isPrivate, setIsPrivate] = useState(community.isPrivate);
  const [isActive, setIsActive] = useState(community.isActive);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rules, setRules] = useState<string[]>(community.rules || []);
  const [selectionTarget, setSelectionTarget] = useState<
    "avatar" | "header" | null
  >(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Image/icon state for avatar
  const [imagePreview, setImagePreview] = useState<string | null>(
    community.image || null,
  );
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(
    community.avatarEmoji ?? null,
  );
  const [avatarBgColor, setAvatarBgColor] = useState<string | null>(
    community.avatarBgColor ?? null,
  );

  // Image/icon state for header
  const [headerPreview, setHeaderPreview] = useState<string | null>(
    community.headerImage || null,
  );
  const [base64Header, setBase64Header] = useState<string | null>(null);
  const [headerEmoji, setHeaderEmoji] = useState<string | null>(
    community.headerEmoji ?? null,
  );
  const [headerBgColor, setHeaderBgColor] = useState<string | null>(
    community.headerBgColor ?? null,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveDialog("main");
      setConfirmDelete(false);
      setSaveSuccess(false);
      setIconPickerTarget(null);
      setSelectionTarget(null);
    }
  }, [isOpen]);

  const handleUpdate = async () => {
    setIsLoading(true);
    setError(null);
    const filteredRules = rules.filter((r) => r.trim() !== "");
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            category,
            isPrivate,
            isActive,
            rules: filteredRules,
            image: base64Image || undefined,
            headerImage: base64Header || undefined,
            avatarEmoji,
            avatarBgColor,
            headerEmoji,
            headerBgColor,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to update community");

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSuccess();
        onClose();
      }, 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(community.name)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete community");
      router.push(`/${locale}/communities`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting");
      setIsLoading(false);
    }
  };

  const handleCropComplete = (blob: Blob, target: "avatar" | "header") => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      if (target === "avatar") {
        setBase64Image(b64);
        setImagePreview(b64);
        // Clear icon fields when a real photo is chosen
        setAvatarEmoji(null);
        setAvatarBgColor(null);
      } else {
        setBase64Header(b64);
        setHeaderPreview(b64);
        setHeaderEmoji(null);
        setHeaderBgColor(null);
      }
      setCropSrc(null);
      setActiveDialog("main");
    };
    reader.readAsDataURL(blob);
  };

  const handleIconConfirm = (
    target: "avatar" | "header",
    emoji: string | null,
    bgColor: string,
  ) => {
    if (target === "avatar") {
      setAvatarEmoji(emoji);
      setAvatarBgColor(bgColor);
      // Clear uploaded image so the icon takes precedence on save
      setBase64Image(null);
      setImagePreview(null);
    } else {
      setHeaderEmoji(emoji);
      setHeaderBgColor(bgColor);
      setBase64Header(null);
      setHeaderPreview(null);
    }
    setIconPickerTarget(null);
    setSelectionTarget(null);
    setActiveDialog("main");
  };

  // Determine what to render in the header banner area
  const showHeaderIcon = !headerPreview && !!headerBgColor;
  const showAvatarIcon = !imagePreview && !!avatarBgColor;

  return (
    <>
      {/* Main Modal */}
      <Dialog
        open={
          isOpen &&
          activeDialog === "main" &&
          iconPickerTarget === null &&
          selectionTarget === null
        }
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-background border-surface-border flex flex-col h-[90dvh] max-h-[90dvh] min-h-0">
          <DialogHeader className="bg-surface py-4 px-6 border-b border-surface-border">
            <DialogTitle className="font-bold text-foreground">
              {t("communityPage.edit_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0">
              <div className="pt-0 px-0 pb-0 flex flex-col gap-0">
                {/* Image Editing Section */}
                <div className="relative mb-10">
                  {/* Header Banner */}
                  <div className="h-32 w-full relative bg-surface-border">
                    {headerPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={headerPreview}
                        alt="Header"
                        className="w-full h-full object-cover"
                      />
                    ) : showHeaderIcon ? (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: headerBgColor! }}
                      >
                        {headerEmoji && (
                          <span
                            className="text-6xl md:text-7xl leading-none select-none"
                            style={{ transform: "translateY(-2px)" }}
                          >
                            {headerEmoji}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-surface-border/20" />
                    )}

                    {/* Header Image & Icon button */}
                    <button
                      type="button"
                      onClick={() => setSelectionTarget("header")}
                      className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors cursor-pointer shadow-md backdrop-blur-sm"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="absolute -bottom-8 left-6">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-background bg-background">
                        {imagePreview && <AvatarImage src={imagePreview} />}
                        {showAvatarIcon ? (
                          <IconAvatar
                            emoji={avatarEmoji}
                            bgColor={avatarBgColor!}
                            emojiSizeClass="text-3xl"
                          />
                        ) : (
                          <AvatarFallback className="text-xl font-bold text-foreground bg-background">
                            {community.name?.[0]?.toUpperCase() || "C"}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      {/* Avatar Image & Icon button */}
                      <button
                        type="button"
                        onClick={() => setSelectionTarget("avatar")}
                        className="absolute -bottom-1 -right-1 bg-surface-opaque border-2 border-surface-border rounded-full p-1.5 text-foreground-60 hover:text-foreground hover:bg-surface-hover transition-colors shadow-sm cursor-pointer"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5 px-6 pb-6 pt-4">
                  {/* Success state */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      display: "grid",
                      gridTemplateRows: saveSuccess ? "1fr" : "0fr",
                      opacity: saveSuccess ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <div className="h-14 w-14 rounded-full bg-feedback-success/15 flex items-center justify-center">
                          <Check className="h-7 w-7 text-feedback-success" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {t("communityPage.update_success")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-white bg-brand rounded-xl">
                      {error}
                    </div>
                  )}

                  <div className="relative rounded-xl border border-surface-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                    <textarea
                      rows={3}
                      placeholder=" "
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none resize-none transition-all"
                    />
                    <label className="absolute left-3 top-4 text-sm text-foreground-60 transition-all pointer-events-none px-1 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background">
                      {t("communitiesPage.create_desc")}
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-foreground">
                      {t("communitiesPage.create_category")}
                    </label>
                    <Select
                      value={category}
                      onValueChange={setCategory}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chronic">
                          {t("communitiesPage.tab_chronic")}
                        </SelectItem>
                        <SelectItem value="physical">
                          {t("communitiesPage.tab_physical")}
                        </SelectItem>
                        <SelectItem value="psychological">
                          {t("communitiesPage.tab_psychological")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className="flex items-center justify-between p-4 rounded-xl border border-surface-border bg-surface cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setActiveDialog("rules")}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">
                        {t("communityPage.edit_rules")}
                      </span>
                      <span className="text-xs text-foreground-60">
                        {rules.length === 1
                          ? t("communityPage.rule_count_single")
                          : t("communityPage.rule_count_plural").replace(
                              "{{count}}",
                              String(rules.length),
                            )}
                      </span>
                    </div>
                    <Edit2 className="h-5 w-5 text-foreground-40" />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-border bg-surface">
                    <Checkbox
                      checked={isPrivate}
                      onCheckedChange={(c) => setIsPrivate(c as boolean)}
                      className="self-center"
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-bold text-foreground cursor-pointer"
                        onClick={() => setIsPrivate(!isPrivate)}
                      >
                        {t("communitiesPage.create_private")}
                      </span>
                      <span className="text-xs text-foreground-60">
                        {t("communitiesPage.create_private_desc")}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-surface-border pt-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">
                        {isActive
                          ? t("communityPage.hide_btn")
                          : t("communityPage.unhide_btn")}
                      </span>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className="w-52 px-4 py-2 h-auto text-xs whitespace-nowrap"
                      >
                        {isActive
                          ? t("communityPage.hide_btn")
                          : t("communityPage.unhide_btn")}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand">
                        {t("communityPage.delete_btn")}
                      </span>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleDelete}
                        className="w-52 px-4 py-2 h-auto text-xs whitespace-nowrap text-brand border-brand hover:bg-brand/10"
                      >
                        {confirmDelete
                          ? t("communityPage.delete_confirm")
                          : t("communityPage.delete_btn")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border bg-surface shrink-0">
              <Button
                variant="ghost"
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="text-foreground-60 hover:text-foreground hover:bg-transparent"
              >
                {t("communitiesPage.cancel")}
              </Button>
              <Button
                variant="brand"
                onClick={handleUpdate}
                disabled={isLoading || saveSuccess}
              >
                {isLoading
                  ? t("communityPage.updating")
                  : t("communityPage.update_btn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageOrIconDialog
        open={!!selectionTarget && iconPickerTarget === null}
        onClose={() => setSelectionTarget(null)}
        title={
          selectionTarget === "avatar"
            ? t("communityPage.edit_avatar_icon")
            : t("communityPage.edit_header_icon")
        }
        onImageSelect={(file) => {
          if (!selectionTarget) return;
          const url = URL.createObjectURL(file);
          setCropSrc(url);
          setActiveDialog(
            selectionTarget === "avatar" ? "crop-avatar" : "crop-header",
          );
          setSelectionTarget(null);
        }}
        onIconPick={() => {
          setIconPickerTarget(selectionTarget);
          setSelectionTarget(null);
        }}
        showRemove={
          selectionTarget === "avatar"
            ? !!imagePreview || !!avatarBgColor
            : !!headerPreview || !!headerBgColor
        }
        onRemove={() => {
          if (selectionTarget === "avatar") {
            setImagePreview(null);
            setBase64Image(null);
            setAvatarEmoji(null);
            setAvatarBgColor(null);
          } else {
            setHeaderPreview(null);
            setBase64Header(null);
            setHeaderEmoji(null);
            setHeaderBgColor(null);
          }
          setSelectionTarget(null);
        }}
        removeLabel={t("profile.remove_image")}
        uploadLabel={t("profile.upload_image")}
        pickIconLabel={t("profile.choose_icon_color")}
      />

      {/* Rules Modal */}
      <EditRulesModal
        isOpen={isOpen && activeDialog === "rules"}
        onClose={() => setActiveDialog("main")}
        rules={rules}
        setRules={setRules}
      />

      {/* Icon Picker Modals */}
      <IconPickerModal
        isOpen={iconPickerTarget === "avatar"}
        onClose={() => {
          setIconPickerTarget(null);
          setSelectionTarget(null);
        }}
        currentEmoji={avatarEmoji}
        currentBgColor={avatarBgColor}
        previewShape="round"
        onConfirm={(emoji, bgColor) =>
          handleIconConfirm("avatar", emoji, bgColor)
        }
        title={t("communityPage.edit_avatar_icon")}
      />
      <IconPickerModal
        isOpen={iconPickerTarget === "header"}
        onClose={() => {
          setIconPickerTarget(null);
          setSelectionTarget(null);
        }}
        currentEmoji={headerEmoji}
        currentBgColor={headerBgColor}
        previewShape="rect"
        onConfirm={(emoji, bgColor) =>
          handleIconConfirm("header", emoji, bgColor)
        }
        title={t("communityPage.edit_header_icon")}
      />

      {/* Cropper Modals */}
      {cropSrc && (
        <>
          <ImageCropperModal
            isOpen={activeDialog === "crop-avatar"}
            onClose={() => {
              setCropSrc(null);
              setActiveDialog("main");
            }}
            imageSrc={cropSrc}
            shape="round"
            aspectRatio={1}
            onCropComplete={(blob) => handleCropComplete(blob, "avatar")}
          />
          <ImageCropperModal
            isOpen={activeDialog === "crop-header"}
            onClose={() => {
              setCropSrc(null);
              setActiveDialog("main");
            }}
            imageSrc={cropSrc}
            shape="rect"
            aspectRatio={3}
            onCropComplete={(blob) => handleCropComplete(blob, "header")}
          />
        </>
      )}
    </>
  );
}
