// src/app/[locale]/(protected)/(components)/posts/post-actions.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { PostActionsProps } from "@/types/app-types";
import {
  Eye,
  Heart,
  Link2,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import { useRef, useState } from "react";

export function PostActions({
  id,
  supports,
  comments,
  userSupported = false,
  layout,
  viewCount = 0,
  isAuthor = false,
}: PostActionsProps) {
  const { t } = useTranslation();
  const [supported, setSupported] = useState(userSupported);
  const [supportCount, setSupportCount] = useState(supports);
  const [isProcessing, setIsProcessing] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggle = async () => {
    if (isProcessing) return;

    // Optimistic UI update
    setSupported((s) => !s);
    setSupportCount((c) => (supported ? c - 1 : c + 1));
    setIsProcessing(true);
    setOfflineError(null);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

    const requestPromise = fetch(`/api/posts/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "support" }),
    });

    // Force the optimistic state to stay visible for at least 1.5 seconds
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      await delayPromise;
      const res = await requestPromise;
      if (!res.ok) throw new Error("Connection failed");
    } catch (err) {
      console.error(err);
      // Revert on failure
      setSupported((s) => !s);
      setSupportCount((c) => (!supported ? c - 1 : c + 1));

      // Show graceful degradation message
      const msg =
        t("post.offline_error") ||
        "Forbindelsen blev afbrudt. Handlingen blev annulleret.";

      setErrorText(msg);
      setOfflineError(msg);

      errorTimeoutRef.current = setTimeout(() => {
        setOfflineError(null);
        setTimeout(() => setErrorText(null), 300);
      }, 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const isCompact = layout === "compact";

  const btnBase = cn(
    "group/btn flex items-center gap-1.5 rounded-full font-semibold transition-all cursor-pointer select-none",
    isCompact
      ? "text-xs px-2 py-1 text-foreground-40"
      : "text-sm px-3 py-2 text-foreground-60",
    "hover:bg-foreground/8 hover:text-foreground",
  );

  const iconCls = "transition-transform duration-200 group-hover/btn:scale-110";

  const menuItemCls =
    "py-3 px-4 rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5 cursor-pointer";

  return (
    <div className="flex flex-col w-full">
      <div
        className={cn("flex items-center gap-0.5", !isCompact && "px-2 py-2")}
      >
        {/* Supports */}
        <button
          onClick={toggle}
          className={cn(
            btnBase,
            supported && "text-brand! hover:text-brand! hover:bg-brand/8!",
          )}
        >
          <Heart
            className={cn(
              iconCls,
              isCompact ? "h-3.5 w-3.5" : "h-4 w-4",
              supported && "fill-brand text-brand",
            )}
          />
          <span>{supportCount}</span>
          {!isCompact && (
            <span className="hidden xs:inline">{t("post.supports")}</span>
          )}
        </button>

        {/* Comments */}
        <button className={btnBase}>
          <MessageCircle
            className={cn(iconCls, isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
          />
          <span>{comments}</span>
          {!isCompact && (
            <span className="hidden xs:inline">{t("post.comments")}</span>
          )}
        </button>

        {/* Share dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={btnBase}>
              <Share2
                className={cn(iconCls, isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
              />
              {!isCompact && <span>{t("post.share")}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-44 overflow-hidden p-0"
          >
            <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
              {t("post.share")}
            </DropdownMenuLabel>
            <DropdownMenuItem className={menuItemCls}>
              <Link2 className="h-4 w-4 mr-2.5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
              {t("post.copy_link")}
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemCls}>
              <Repeat2 className="h-4 w-4 mr-2.5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
              {t("post.crosspost")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View count - only visible to the post author, always shown so 0 is visible too */}
        {isAuthor && (
          <span className="ml-auto flex items-center gap-1 text-xs text-foreground/40 px-2">
            <Eye className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            {viewCount}
          </span>
        )}
      </div>

      {/* Graceful Degradation Error Message */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          offlineError ? "max-h-10 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div
          className={cn(
            "text-xs font-bold text-brand px-3 pb-2 pt-1 transition-transform duration-300 ease-in-out",
            offlineError ? "translate-y-0" : "-translate-y-2",
          )}
        >
          {errorText}
        </div>
      </div>
    </div>
  );
}
