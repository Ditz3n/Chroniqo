// src/app/[locale]/(protected)/feed/(components)/recent-post-card.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { MediaType, RecentPost } from "@/types/app-types";

function MediaBadge({ media }: { media: MediaType }) {
  const { t } = useTranslation();
  if (media.kind === "youtube") {
    return (
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 bg-black/80 rounded px-1.5 py-0.5 overflow-hidden">
        {/* YouTube icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
            fill="#FF0000"
          />
          <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
        </svg>
        <span className="text-[10px] font-semibold text-white leading-none truncate">
          {t("post.youtube")}
        </span>
      </div>
    );
  }

  if (media.kind === "video") {
    return (
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/80 rounded px-1.5 py-0.5">
        {/* Play icon */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="text-[10px] font-semibold text-white leading-none">
          {media.duration}
        </span>
      </div>
    );
  }

  if (media.kind === "link") {
    return (
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 bg-black/80 rounded px-1.5 py-0.5 max-w-full overflow-hidden">
        {/* Link icon */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="text-[10px] font-semibold text-white leading-none truncate">
          {media.siteName}
        </span>
      </div>
    );
  }

  return null;
}

export function RecentPostCard({
  community,
  authorUsername,
  communityImage,
  communityEmoji,
  communityBgColor,
  authorImage,
  authorEmoji,
  authorBgColor,
  timeAgo,
  title,
  likes,
  comments,
  media,
  authorEmailVerified,
}: RecentPost & { authorEmailVerified?: boolean | string | Date | null }) {
  const { t } = useTranslation();

  const isProfile = community.startsWith("u/");
  const displayName = isProfile
    ? authorUsername || "U"
    : community.replace("c/", "");
  const initial = displayName[0]?.toUpperCase() || "U";

  const image = isProfile ? authorImage : communityImage;
  const emoji = isProfile ? authorEmoji : communityEmoji;
  const bgColor = isProfile ? authorBgColor : communityBgColor;

  return (
    <div className="flex gap-3 p-3 items-start cursor-pointer">
      <Avatar className="h-7 w-7 border border-surface-border bg-background flex-shrink-0 mt-0.5">
        <AvatarImage src={image || undefined} className="object-cover" />
        <AvatarFallback className="bg-brand/20 text-[10px] font-bold text-brand p-0 overflow-hidden w-full h-full flex items-center justify-center">
          {bgColor && !image ? (
            <IconAvatar
              emoji={emoji}
              bgColor={bgColor}
              emojiSizeClass="text-[10px]"
            />
          ) : (
            initial
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 mr-2">
        <div className="flex items-center gap-1 text-xs text-foreground-60 mb-1">
          <span className="font-semibold truncate flex items-center gap-1">
            {community}
            {isProfile && authorEmailVerified && (
              <VerifiedBadge className="h-3.5 w-3.5" />
            )}
          </span>
          <span>•</span>
          <span className="flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground">
          {title}
        </p>
        <div className="flex items-center gap-2 text-xs text-foreground-40 mt-1.5 whitespace-nowrap">
          <span>
            {likes} {t("post.supports")}
          </span>
          <span>•</span>
          <span>
            {comments} {t("post.comments")}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      {media && (
        <div className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <MediaBadge media={media} />
        </div>
      )}
    </div>
  );
}
