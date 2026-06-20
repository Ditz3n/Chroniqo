// src/app/[locale]/(protected)/(components)/posts/image-post.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ImagePostProps as BaseImagePostProps } from "@/types/app-types";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { PostActions } from "./post-actions";
import { PostHeader } from "./post-header";

type ImagePostProps = BaseImagePostProps & { isPriority?: boolean };

function SpoilerOverlay({
  revealed,
  onReveal,
  compact,
}: {
  revealed: boolean;
  onReveal: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center group",
        "bg-black/80 backdrop-blur-md cursor-pointer transition-all duration-300",
        compact && "rounded-xl",
        revealed && "opacity-0 pointer-events-none",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onReveal();
      }}
    >
      {!compact && (
        <>
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-3 transition-all duration-200 group-hover:bg-white/20 group-hover:scale-110">
            <Eye className="h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110" />
          </div>
          <span className="text-white font-semibold text-sm">
            {t("post.reveal_spoiler")}
          </span>
        </>
      )}
    </div>
  );
}

export function ImagePost({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView,
  isPriority = false,
}: ImagePostProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(!post.spoiler);
  const { t } = useTranslation();

  const src = post.images[index];
  const isMulti = post.images.length > 1;

  if (layout === "compact") {
    return (
      <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors">
        <div className="relative aspect-square self-stretch max-h-20 min-w-[3rem] rounded-xl overflow-hidden flex-shrink-0 bg-foreground/10">
          <Image
            src={src}
            alt=""
            fill
            priority={isPriority}
            sizes="80px"
            className="object-cover"
          />
          <SpoilerOverlay
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            compact
          />
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

      {/* Title above media */}
      <div className="px-4 pb-2">
        <h2 className="font-heading font-bold text-xl leading-snug line-clamp-2">
          {post.title}
        </h2>
      </div>

      <div className="relative aspect-video bg-black overflow-hidden">
        {/* Blurred background fill - Using Image guarantees optimal resolution sync with main image */}
        <div className="absolute inset-0 scale-110 blur-xl brightness-50 z-0">
          <Image
            src={src}
            alt=""
            fill
            priority={isPriority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        </div>

        {/* Main LCP Image */}
        <Image
          src={src}
          alt={post.title}
          fill
          priority={isPriority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={cn(
            "object-contain z-10 transition-opacity duration-300",
            !revealed && "opacity-0 invisible",
          )}
        />

        {/* Spoiler overlay */}
        <SpoilerOverlay
          revealed={revealed}
          onReveal={() => setRevealed(true)}
        />

        {isMulti && revealed && (
          <>
            <div className="absolute top-3 left-3 z-20 bg-black/60 rounded-full px-2.5 py-1 text-xs font-bold text-white">
              {index + 1} / {post.images.length}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIndex((i) => Math.max(0, i - 1));
              }}
              disabled={index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-0 hover:bg-black/80 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIndex((i) => Math.min(post.images.length - 1, i + 1));
              }}
              disabled={index === post.images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-0 hover:bg-black/80 transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {post.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(i);
                  }}
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

      {post.body && isSingleView && (
        <div className="px-4 py-3 border-t border-surface-border/30">
          <MarkdownRenderer content={post.body} />
        </div>
      )}

      <PostActions {...post} layout="card" />
    </div>
  );
}
