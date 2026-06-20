// src/app/[locale]/(protected)/communities/(components)/create-community-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/hooks/use-translation";
import { CreateCommunityModalProps } from "@/types/app-types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateCommunityModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCommunityModalProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("chronic");
  const [isPrivate, setIsPrivate] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, isPrivate }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create community");
      }

      setName("");
      setDescription("");
      setCategory("chronic");
      setIsPrivate(false);
      onSuccess();

      // Redirect the user to the newly created community
      router.push(
        `/${locale}/communities/${encodeURIComponent(data.community.name)}`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background p-0 overflow-hidden gap-0">
        <DialogHeader className="bg-surface py-4">
          <DialogTitle className="font-bold">
            {t("communitiesPage.create_title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 text-sm text-white bg-brand rounded-xl">
                {error}
              </div>
            )}

            {/* Name Input */}
            <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
              <input
                id="name"
                type="text"
                required
                placeholder=" "
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s/g, ""))}
                className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all"
              />
              <label
                htmlFor="name"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                  peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                  peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
              >
                {t("communitiesPage.create_name")}
              </label>
            </div>

            {/* Description Input */}
            <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
              <textarea
                id="description"
                rows={3}
                placeholder=" "
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="peer w-full px-4 pt-5 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none appearance-none transition-all resize-none"
              />
              <label
                htmlFor="description"
                className="absolute left-3 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                  peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                  peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs bg-background"
              >
                {t("communitiesPage.create_desc")}
              </label>
            </div>

            {/* Category Select */}
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

            {/* Privacy Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-border bg-surface">
              <Checkbox
                id="isPrivate"
                checked={isPrivate}
                onCheckedChange={(c) => setIsPrivate(c as boolean)}
                className="self-center"
              />
              <div className="flex flex-col">
                <label
                  htmlFor="isPrivate"
                  className="text-sm font-bold text-foreground cursor-pointer"
                >
                  {t("communitiesPage.create_private")}
                </label>
                <span className="text-xs text-foreground-60">
                  {t("communitiesPage.create_private_desc")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-2 -mx-4 -mb-4 px-4 py-3 border-t border-surface-border bg-surface">
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
                type="submit"
                variant="brand"
                disabled={isLoading || !name.trim()}
              >
                {isLoading
                  ? t("communitiesPage.creating")
                  : t("communitiesPage.create_submit")}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
