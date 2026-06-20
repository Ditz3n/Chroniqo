// src/app/[locale]/(protected)/search/(components)/user-result-card.tsx
import { Smiley } from "@/app/(components)/smiley";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { UserResultCardProps } from "@/types/app-types";
import Link from "next/link";

export function UserResultCard({
  user,
  locale,
  friendsLabel,
  supportsLabel,
}: UserResultCardProps) {
  // Defensive: ensure header fields are present
  const headerImage = user.headerImage ?? null;
  const headerEmoji = user.headerEmoji ?? null;
  const headerBgColor = user.headerBgColor ?? null;
  const hasMood = user.currentMood != null;
  const moodValue = hasMood ? user.currentMood!.value : null;
  const moodColor = getMoodRingColor(moodValue);

  return (
    <Link
      href={`/${locale}/u/${user.username}`}
      className="flex flex-col rounded-2xl border border-surface-border bg-surface overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Header - custom image, emoji+color, or fallback */}
      <div className="h-24 w-full relative overflow-hidden flex-shrink-0 flex items-center justify-center">
        {headerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headerImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : headerBgColor && headerEmoji ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: headerBgColor }}
          >
            <span
              className="text-5xl leading-none select-none"
              style={{ transform: "translateY(-2px)" }}
            >
              {headerEmoji}
            </span>
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: moodColor }}
          >
            <div className="w-14 h-14 opacity-30">
              <Smiley statusValue={moodValue ?? 2} color="white" />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-0 relative flex-1 flex flex-col">
        {/* Avatar with mood ring */}
        <div className="absolute -top-8 left-5">
          <Avatar
            className="h-16 w-16 border-4 border-surface bg-background transition-all ring-2 ring-offset-2 ring-offset-background"
            style={{ "--tw-ring-color": moodColor } as React.CSSProperties}
          >
            {user.avatarEmoji && user.avatarBgColor ? (
              <IconAvatar
                emoji={user.avatarEmoji}
                bgColor={user.avatarBgColor}
                emojiSizeClass="text-2xl"
              />
            ) : user.image ? (
              <AvatarImage src={user.image} />
            ) : user.username ? (
              <AvatarFallback className="bg-surface text-foreground font-bold text-xl">
                {user.username[0].toUpperCase()}
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-surface text-foreground font-bold text-xl">
                U
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        {/* Row: name/handle on the left, stats on the right */}
        <div className="mt-10 flex items-end justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <h3 className="font-heading font-bold text-lg text-foreground truncate flex items-center gap-1.5">
              {user.name ?? user.username ?? "User"}
              {user.emailVerified && <VerifiedBadge className="h-5 w-5" />}
            </h3>
            {user.username && (
              <span className="text-xs font-semibold text-foreground-40 uppercase tracking-wider truncate">
                u/{user.username}
              </span>
            )}
          </div>

          {user.stats && (
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span className="text-sm font-bold text-foreground">
                {user.stats.friends}{" "}
                <span className="text-xs font-semibold text-foreground-40">
                  {friendsLabel}
                </span>
              </span>
              <span className="text-sm font-bold text-foreground">
                {user.stats.supports}{" "}
                <span className="text-xs font-semibold text-foreground-40">
                  {supportsLabel}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
