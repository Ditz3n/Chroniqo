// src/app/[locale]/(protected)/search/(components)/community-result-card.tsx
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { CommunityResultCardProps } from "@/types/app-types";
import { Users } from "lucide-react";
import Link from "next/link";

export function CommunityResultCard({
  community,
  locale,
  membersLabel,
}: CommunityResultCardProps) {
  return (
    <Link
      href={`/${locale}/communities/${community.name}`}
      className="flex flex-col rounded-2xl border border-surface-border bg-surface overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Header image */}
      <div className="h-24 w-full bg-surface-border/50 relative overflow-hidden flex-shrink-0 flex items-center justify-center">
        {community.headerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.headerImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : community.headerBgColor ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: community.headerBgColor }}
          >
            {community.headerEmoji && (
              <span
                className="text-5xl leading-none select-none"
                style={{ transform: "translateY(-2px)" }}
              >
                {community.headerEmoji}
              </span>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-surface-border/20" />
        )}
      </div>

      <div className="px-5 pb-5 pt-0 relative flex-1 flex flex-col">
        {/* Avatar overlapping header */}
        <div className="absolute -top-8 left-5">
          <Avatar className="h-16 w-16 border-4 border-surface ring-0 bg-background">
            {community.image && <AvatarImage src={community.image} />}
            {!community.image && community.avatarBgColor ? (
              <IconAvatar
                emoji={community.avatarEmoji}
                bgColor={community.avatarBgColor}
                emojiSizeClass="text-2xl"
              />
            ) : (
              <AvatarFallback className="bg-background text-brand font-bold text-xl">
                {community.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        <div className="mt-10 flex flex-col flex-1">
          <h3 className="font-heading font-bold text-lg text-foreground truncate">
            {community.name}
          </h3>
          <p className="text-xs font-semibold text-foreground-40 uppercase tracking-wider mb-3">
            c/{community.name.toLowerCase()}
          </p>
          <div className="flex items-center gap-1.5 mt-auto text-xs font-medium text-foreground-60 pt-4 border-t border-surface-border">
            <Users className="h-4 w-4" />
            <span>
              {community._count.members} {membersLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
