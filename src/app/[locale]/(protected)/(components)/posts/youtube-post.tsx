// src/app/[locale]/(protected)/(components)/posts/youtube-post.tsx
"use client";

import { YoutubePostProps } from "@/types/app-types";
import Image from "next/image";
import { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { PostActions } from "./post-actions";
import { PostHeader } from "./post-header";

type ExtendedYoutubePostProps = YoutubePostProps & { isPriority?: boolean };

function YouTubeThumbnail({
  videoId,
  compact = false,
  onPlay,
  isPriority = false,
}: {
  videoId: string;
  compact?: boolean;
  onPlay: () => void;
  isPriority?: boolean;
}) {
  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (compact) {
    return (
      <div
        className="relative aspect-square self-stretch max-h-20 min-w-[3rem] rounded-xl overflow-hidden flex-shrink-0 bg-black cursor-pointer group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPlay();
        }}
      >
        <Image
          src={thumb}
          alt=""
          fill
          priority={isPriority}
          sizes="80px"
          className="object-cover"
        />
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
          <div className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              className="ml-0.5"
            >
              <path d="M8 5v14l11-7z" fill="#FF0000" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video bg-black overflow-hidden cursor-pointer group"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPlay();
      }}
    >
      <div
        className="absolute inset-0 scale-110 blur-xl brightness-40 bg-cover bg-center"
        style={{ backgroundImage: `url(${thumb})` }}
      />
      <Image
        src={thumb}
        alt=""
        fill
        priority={isPriority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-contain z-10"
      />
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-black/60 flex items-center justify-center hover:scale-110 group-hover:bg-black/80 transition-all">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            className="ml-1"
          >
            <path d="M8 5v14l11-7z" fill="white" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/70 rounded-lg px-2.5 py-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
            fill="#FF0000"
          />
          <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
        </svg>
        <span className="text-xs font-semibold text-white">YouTube</span>
      </div>
    </div>
  );
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-video" onClick={(e) => e.stopPropagation()}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}

export function YoutubePost({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView,
  isPriority = false,
}: ExtendedYoutubePostProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  if (layout === "compact") {
    return (
      <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors">
        <YouTubeThumbnail
          videoId={post.videoId}
          compact
          onPlay={() => setShowEmbed(true)}
          isPriority={isPriority}
        />
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

      {showEmbed ? (
        <YouTubeEmbed videoId={post.videoId} />
      ) : (
        <YouTubeThumbnail
          videoId={post.videoId}
          onPlay={() => setShowEmbed(true)}
          isPriority={isPriority}
        />
      )}

      {post.body && isSingleView && (
        <div className="px-4 py-3 border-t border-surface-border/30">
          <MarkdownRenderer content={post.body} />
        </div>
      )}

      <PostActions {...post} layout="card" />
    </div>
  );
}
