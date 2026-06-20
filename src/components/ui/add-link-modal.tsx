// src/components/ui/add-link-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { AddLinkModalProps } from "@/types/app-types";
import { useEffect, useState } from "react";

function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /\.[a-zA-Z]{2,}/.test(trimmed);
}

export function AddLinkModal({
  isOpen,
  onClose,
  onSave,
  initialText = "",
  initialUrl = "",
}: AddLinkModalProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [urlTouched, setUrlTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        setText(initialText);
        setUrl(initialUrl);
        setUrlTouched(false);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, initialText, initialUrl]);

  const handleSave = () => {
    if (text.trim() && url.trim() && isValidUrl(url)) {
      onSave(text.trim(), url.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setText("");
    setUrl("");
    setUrlTouched(false);
    onClose();
  };

  const urlIsValid = isValidUrl(url);

  let validationMessage = "";
  let validationClass = "text-foreground-60";

  if (!urlTouched) {
    validationMessage = t("richText.enter_valid_link");
    validationClass = "text-foreground-60";
  } else if (!urlIsValid) {
    validationMessage = t("richText.invalid_link");
    validationClass = "text-brand";
  } else {
    validationMessage = t("richText.valid_link");
    validationClass = "text-brand";
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-background p-0 overflow-hidden gap-0">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold">
            {t("richText.add_link")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
              <input
                id="link-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder=" "
                className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all"
                autoFocus
              />
              <label
                htmlFor="link-text"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                  peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                  peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
              >
                {t("richText.link_text")}
              </label>
            </div>
            <div className="space-y-2">
              <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                <input
                  id="link-url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (!urlTouched) setUrlTouched(true);
                  }}
                  placeholder=" "
                  className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all"
                />
                <label
                  htmlFor="link-url"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
                >
                  {t("richText.link_url")} <span className="text-brand">*</span>
                </label>
              </div>
              <p
                className={`text-xs transition-colors px-1 ${validationClass}`}
              >
                {validationMessage}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-2 -mx-4 -mb-4 px-4 py-3 border-t border-surface-border bg-surface">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="px-6 rounded-full cursor-pointer h-auto py-2 text-foreground-60 hover:text-foreground hover:bg-transparent"
              >
                {t("richText.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!text.trim() || !urlIsValid}
                className="px-6 rounded-full cursor-pointer h-auto py-2"
              >
                {t("richText.save")}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
