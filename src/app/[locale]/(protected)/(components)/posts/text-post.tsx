// src/app/[locale]/(protected)/(components)/posts/text-post.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { TextPostProps } from "@/types/app-types";
import { AlignLeft } from "lucide-react";
import { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { PostActions } from "./post-actions";
import { PostHeader } from "./post-header";

/**
 * Handles the "whole post" spoiler wrapper.
 * If revealed, it renders the rich markdown content securely.
 */
function SpoilerBody({
  text,
  revealed,
  onReveal,
  isSingleView,
}: {
  text: string;
  revealed: boolean;
  onReveal: () => void;
  isSingleView?: boolean;
}) {
  return (
    <div
      className={cn(!revealed && "cursor-pointer group/spoiler")}
      onClick={!revealed ? onReveal : undefined}
    >
      {revealed ? (
        <div
          className={cn(
            "relative transition-all duration-300",
            !isSingleView && "max-h-[300px] overflow-hidden",
          )}
          style={
            !isSingleView
              ? {
                  WebkitMaskImage:
                    "linear-gradient(180deg, #000 80%, transparent 100%)",
                  maskImage:
                    "linear-gradient(180deg, #000 80%, transparent 100%)",
                }
              : undefined
          }
        >
          <MarkdownRenderer content={text} />
        </div>
      ) : (
        <div className="text-sm text-foreground-60 leading-relaxed line-clamp-6 select-none">
          {text.split(" ").map((word, i, arr) => (
            <span key={i}>
              <span className="inline-block rounded-[3px] px-[1px] transition-all duration-300 text-transparent bg-foreground/20 group-hover/spoiler:bg-foreground/30">
                {word}
              </span>
              {i < arr.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TextPost({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView,
}: TextPostProps) {
  const [revealed, setRevealed] = useState(!post.spoiler);
  const { t } = useTranslation();

  if (layout === "compact") {
    return (
      <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors">
        <div className="w-20 h-20 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 border border-surface-border">
          <AlignLeft className="h-5 w-5 text-foreground-40" />
        </div>
        <div className="flex-1 min-w-0">
          <PostHeader
            post={post}
            layout="compact"
            hasPinnedPostInFeed={hasPinnedPostInFeed}
            onHideDelete={onHideDelete}
            currentTab={currentTab}
          />
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mt-0.5 mb-1 text-foreground">
            {post.title}
            {post.spoiler && (
              <span className="ml-1.5 text-[10px] font-bold uppercase text-foreground-40 tracking-wider">
                {t("post.spoiler")}
              </span>
            )}
          </h3>
          <PostActions {...post} layout="compact" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden">
      <PostHeader
        post={post}
        layout="card"
        hasPinnedPostInFeed={hasPinnedPostInFeed}
        onHideDelete={onHideDelete}
        currentTab={currentTab}
      />
      <div className="px-4 pb-4">
        <h2 className="font-heading font-bold text-xl leading-snug mb-2">
          {post.title}
        </h2>
        <SpoilerBody
          text={post.body}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          isSingleView={isSingleView}
        />
      </div>
      <PostActions {...post} layout="card" isAuthor={post.isAuthor} />
    </div>
  );
}
