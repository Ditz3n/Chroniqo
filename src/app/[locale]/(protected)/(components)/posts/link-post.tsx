// src/app/[locale]/(protected)/(components)/posts/link-post.tsx
"use client";

import { LinkPostProps } from "@/types/app-types";
import { ExternalLink, Link2 } from "lucide-react";
import Image from "next/image";
import { MarkdownRenderer } from "./markdown-renderer";
import { PostActions } from "./post-actions";
import { PostHeader } from "./post-header";

function LinkCard({
  url,
  siteName,
  metaTitle,
  metaDescription,
  metaImage,
  compact = false,
  isPriority = false,
}: {
  url: string;
  siteName: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  compact?: boolean;
  isPriority?: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className="relative aspect-square self-stretch max-h-20 min-w-[3rem] rounded-xl overflow-hidden flex-shrink-0 bg-foreground/10 cursor-pointer group"
      >
        <Image
          src={metaImage}
          alt=""
          fill
          priority={isPriority}
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 z-10 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-white" />
        </div>
        {/* Link icon badge */}
        <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded p-0.5">
          <Link2 className="h-2.5 w-2.5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="mx-4 rounded-xl border border-surface-border overflow-hidden cursor-pointer hover:border-foreground/20 transition-colors group bg-background"
    >
      {/* Meta image */}
      {metaImage && (
        <div className="relative h-44 overflow-hidden bg-foreground/10">
          <Image
            src={metaImage}
            alt={metaTitle}
            fill
            priority={isPriority}
            unoptimized
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2.5">
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Link2 className="h-3 w-3 text-foreground-40 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-foreground-40 uppercase tracking-wider truncate">
            {siteName}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1 mb-0.5">
          {metaTitle}
        </p>
        {metaDescription && (
          <p className="text-xs text-foreground-60 leading-snug line-clamp-2">
            {metaDescription}
          </p>
        )}
      </div>
    </div>
  );
}

type ExtendedLinkPostProps = LinkPostProps & { isPriority?: boolean };

export function LinkPost({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView,
  isPriority = false,
}: ExtendedLinkPostProps) {
  if (layout === "compact") {
    return (
      <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors">
        <LinkCard {...post} compact isPriority={isPriority} />
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
      <div className="px-4 pt-1 pb-2">
        <h2 className="font-heading font-bold text-xl leading-snug">
          {post.title}
        </h2>
      </div>
      <LinkCard {...post} isPriority={isPriority} />

      {post.body && isSingleView && (
        <div className="px-4 py-3 border-t border-surface-border/30">
          <MarkdownRenderer content={post.body} />
        </div>
      )}

      <PostActions {...post} layout="card" />
    </div>
  );
}
