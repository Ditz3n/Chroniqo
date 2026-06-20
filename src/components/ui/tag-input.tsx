// src/components/ui/tag-input.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { X } from "lucide-react";
import * as React from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

const MAX_VISIBLE = 8;

export function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const { t } = useTranslation();

  const filteredSuggestions = suggestions.filter(
    (s) =>
      typeof s === "string" &&
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s),
  );

  const handleAdd = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter") return;
    if (e) e.preventDefault();

    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const isOpen = showSuggestions && filteredSuggestions.length > 0;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex gap-2">
        <Popover open={isOpen}>
          <PopoverAnchor asChild>
            <div className="relative flex-1">
              <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
                <input
                  id="tag-input"
                  type="text"
                  autoComplete="off"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleAdd}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 150)
                  }
                  placeholder=" "
                  className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none"
                />
                <label
                  htmlFor="tag-input"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                >
                  {placeholder}
                </label>
              </div>
            </div>
          </PopoverAnchor>

          <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={() => {
                  onChange([...tags, suggestion]);
                  setInputValue("");
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-4 py-3 border border-surface-border bg-card text-foreground font-semibold rounded-xl hover:bg-foreground/5 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {t("onboarding.add_button")}
        </button>
      </div>

      {tags.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 items-start content-start">
            {tags.slice(0, MAX_VISIBLE).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand text-white max-w-[12rem] shrink-0"
              >
                <span className="truncate">{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(tag)}
                  className="p-0.5 hover:bg-black/20 rounded-full transition-colors cursor-pointer"
                  aria-label={t("onboarding.tag_remove_label", { tag })}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {tags.length > MAX_VISIBLE && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand/80 transition-colors cursor-pointer"
              >
                {t("onboarding.tag_more", { count: tags.length - MAX_VISIBLE })}
              </button>
            )}
          </div>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("onboarding.dialog.title")}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <div className="flex flex-wrap gap-2 items-start content-start">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand text-white max-w-[12rem] shrink-0"
                    >
                      <span className="truncate">{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(tag)}
                        className="p-0.5 hover:bg-black/20 rounded-full transition-colors cursor-pointer"
                        aria-label={t("onboarding.tag_remove_label", { tag })}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </DialogBody>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
