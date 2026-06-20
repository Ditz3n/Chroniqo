// src/app/[locale]/(protected)/u/[username]/settings/(components)/privacy-settings.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/types/app-types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function PrivacySettings({
  profile,
  onUpdate,
}: {
  profile: UserProfile;
  onUpdate: () => void;
}) {
  const { t } = useTranslation();
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate ?? false);
  const [messagingPermission, setMessagingPermission] = useState(
    profile.messagingPermission ?? "ALL",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isDirty =
    isPrivate !== profile.isPrivate ||
    messagingPermission !== profile.messagingPermission;

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate, messagingPermission }),
      });
      if (res.ok) {
        onUpdate();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err) {
      console.error("[PrivacySettings] save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const permLabels = {
    ALL: t("settings.msg_all"),
    ONLY_FRIENDS: t("settings.msg_friends"),
    NONE: t("settings.msg_none"),
  };

  return (
    <div className="flex flex-col gap-8 bg-surface border border-surface-border rounded-2xl p-6">
      {/* Profile Visibility */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-bold text-foreground">
            {t("settings.visibility")}
          </span>
          <span className="text-sm text-foreground-60">
            {t("settings.visibility_desc")}
          </span>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-between w-full sm:w-48 px-4 py-2.5 bg-background border border-surface-border rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors">
              {isPrivate ? t("settings.private") : t("settings.public")}
              <ChevronDown className="h-4 w-4 text-foreground-40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-full sm:w-48 bg-background rounded-xl"
          >
            <DropdownMenuItem
              onClick={() => setIsPrivate(false)}
              className={cn(
                "px-4 py-3 cursor-pointer rounded-none",
                !isPrivate && "bg-foreground/5 font-bold",
              )}
            >
              {t("settings.public")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsPrivate(true)}
              className={cn(
                "px-4 py-3 cursor-pointer rounded-none",
                isPrivate && "bg-foreground/5 font-bold",
              )}
            >
              {t("settings.private")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px w-full bg-surface-border" />

      {/* Messaging Permission */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-bold text-foreground">
            {t("settings.messaging_permissions")}
          </span>
          <span className="text-sm text-foreground-60">
            {t("settings.messaging_permissions_desc")}
          </span>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-between w-full sm:w-48 px-4 py-2.5 bg-background border border-surface-border rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors">
              {permLabels[messagingPermission]}
              <ChevronDown className="h-4 w-4 text-foreground-40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-full sm:w-48 bg-background rounded-xl"
          >
            {(["ALL", "ONLY_FRIENDS", "NONE"] as const).map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => setMessagingPermission(p)}
                className={cn(
                  "px-4 py-3 cursor-pointer rounded-none",
                  messagingPermission === p && "bg-foreground/5 font-bold",
                )}
              >
                {permLabels[p]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4">
        {showSuccess && (
          <span className="text-sm font-bold text-brand animate-in fade-in">
            {t("settings.success")}
          </span>
        )}
        <Button
          disabled={!isDirty || isSaving}
          onClick={handleSave}
          className="cursor-pointer"
        >
          {isSaving ? t("settings.saving") : t("settings.save")}
        </Button>
      </div>
    </div>
  );
}
