// src/components/ui/avatar.tsx
"use client";

import { getMoodRingColor } from "@/lib/utils/mood-ring";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { cn } from "@/lib/utils";
import { ChatAvatarParticipant } from "@/types/app-types";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-secondary",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Renders a solid-color background with an optional centered emoji.
// Used as the visual layer inside an Avatar when the user has chosen
// an icon+color instead of uploading a photo.
export function IconAvatar({
  emoji,
  bgColor,
  className,
  emojiSizeClass = "text-2xl",
}: {
  emoji?: string | null;
  bgColor: string;
  className?: string;
  emojiSizeClass?: string;
}) {
  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center",
        className,
      )}
      style={{ backgroundColor: bgColor }}
    >
      {emoji ? (
        <span
          className={cn(emojiSizeClass, "leading-none select-none")}
          style={{ transform: "translateY(-1px)" }}
        >
          {emoji}
        </span>
      ) : null}
    </div>
  );
}

// --- Support group-level avatarEmoji/avatarBgColor for group chats ---
export function ChatAvatar({
  participants,
  chatImage,
  className,
  ringParticipants,
  emojiSizeClass = "text-xl",
  avatarEmoji,
  avatarBgColor,
  name,
}: {
  participants: ChatAvatarParticipant[];
  chatImage?: string | null;
  className?: string;
  ringColor?: string;
  ringParticipants?: ChatAvatarParticipant[];
  emojiSizeClass?: string;
  avatarEmoji?: string | null;
  avatarBgColor?: string | null;
  name?: string | null;
}) {
  if (!participants || participants.length === 0) {
    // Community chats: render image, emoji/color, or text initial rather than "?"
    const communityInitial = name
      ? name.replace(/^c\//, "").trim().slice(0, 2).toUpperCase()
      : "?";
    return (
      <Avatar
        className={cn(
          "border border-surface-border overflow-hidden",
          className,
        )}
      >
        <AvatarImage src={chatImage || undefined} className="object-cover" />
        <AvatarFallback className="bg-surface text-foreground font-bold p-0 overflow-hidden w-full h-full flex items-center justify-center">
          {avatarBgColor && !chatImage ? (
            <IconAvatar
              emoji={avatarEmoji}
              bgColor={avatarBgColor}
              emojiSizeClass={emojiSizeClass}
            />
          ) : (
            communityInitial
          )}
        </AvatarFallback>
      </Avatar>
    );
  }

  // --- If group-level avatarBgColor is present, render it INSIDE the segmented ring, even if emoji is missing ---
  if (participants.length > 1 && avatarBgColor) {
    let background = "transparent";
    const MAX_SEGMENTS = 12;
    const ringUsers = (ringParticipants ?? participants).slice(0, MAX_SEGMENTS);

    if (ringUsers.length > 0) {
      const segments = ringUsers.map((p, i) => {
        const val = p.user.dailyStatuses?.[0]?.value;
        const color = getMoodRingColor(val ?? null);
        const start = (i / ringUsers.length) * 100;
        const end = ((i + 1) / ringUsers.length) * 100;
        return `${color} ${start}%, ${color} ${end}%`;
      });
      background = `conic-gradient(${segments.join(", ")})`;
    }

    return (
      <div className={cn("relative flex shrink-0 rounded-full", className)}>
        {background !== "transparent" && (
          <div
            className="absolute rounded-full"
            style={{
              background,
              inset: "-4px",
              zIndex: 0,
            }}
          >
            <div className="absolute inset-[2px] bg-background rounded-full" />
          </div>
        )}
        <div className="w-full h-full rounded-full bg-background overflow-hidden border-2 border-surface-border flex items-center justify-center relative z-10">
          <IconAvatar
            emoji={avatarEmoji}
            bgColor={avatarBgColor}
            emojiSizeClass={emojiSizeClass}
          />
        </div>
      </div>
    );
  }

  // Only render a standard Avatar if it is strictly a 1:1 chat.
  // Group chats (even with custom images) will proceed to the segmented ring logic.
  if (participants.length === 1) {
    const p = participants[0];
    const statusValue = p?.user?.dailyStatuses?.[0]?.value;
    // Always show ring - gray fallback when no status registered today
    const color = getMoodRingColor(statusValue ?? null);

    const fallbackText = chatImage
      ? "G"
      : p?.user?.username?.[0]?.toUpperCase() ||
        p?.user?.name?.[0]?.toUpperCase() ||
        "?";

    return (
      <Avatar
        className={cn(
          "border-2 border-surface-border ring-2 ring-offset-2 ring-offset-background",
          className,
        )}
        style={{ "--tw-ring-color": color } as React.CSSProperties}
      >
        <AvatarImage
          src={(chatImage ?? p?.user?.image) || undefined}
          className="object-cover"
        />
        <AvatarFallback className="font-bold bg-surface text-foreground p-0 overflow-hidden w-full h-full flex items-center justify-center">
          {!chatImage && !p?.user?.image && p?.user?.avatarBgColor ? (
            <IconAvatar
              emoji={p.user.avatarEmoji}
              bgColor={p.user.avatarBgColor}
              emojiSizeClass={emojiSizeClass}
            />
          ) : (
            fallbackText
          )}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Composite Group Chat (Segmented Mood Ring)
  const users = participants.slice(0, 4);
  let background = "transparent";
  const MAX_SEGMENTS = 12;
  const ringUsers = (ringParticipants ?? participants).slice(0, MAX_SEGMENTS);

  if (ringUsers.length > 0) {
    const segments = ringUsers.map((p, i) => {
      const val = p.user.dailyStatuses?.[0]?.value;
      // Gray fallback instead of transparent - all N segments stay visible;
      // midnight reset renders every segment gray until users re-register
      const color = getMoodRingColor(val ?? null);
      const start = (i / ringUsers.length) * 100;
      const end = ((i + 1) / ringUsers.length) * 100;
      return `${color} ${start}%, ${color} ${end}%`;
    });
    background = `conic-gradient(${segments.join(", ")})`;
  }

  return (
    <div className={cn("relative flex shrink-0 rounded-full", className)}>
      {background !== "transparent" && (
        <div
          className="absolute rounded-full"
          style={{
            background,
            inset: "-4px",
            zIndex: 0,
          }}
        >
          <div className="absolute inset-[2px] bg-background rounded-full" />
        </div>
      )}

      <div className="w-full h-full rounded-full bg-background overflow-hidden border-2 border-surface-border flex items-center justify-center relative z-10">
        <div className="w-full h-full relative bg-surface-border">
          {/* eslint-disable @next/next/no-img-element */}

          {/* If a custom chat image exists, render it filling the entire segmented ring. */}
          {chatImage ? (
            <img
              src={chatImage}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <>
              {users.length === 2 && (
                <div className="flex w-full h-full gap-[1px]">
                  <div className="w-1/2 h-full relative overflow-hidden">
                    {users[0].user.image ? (
                      <img
                        src={users[0].user.image}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : users[0].user.avatarBgColor ? (
                      <IconAvatar
                        emoji={users[0].user.avatarEmoji}
                        bgColor={users[0].user.avatarBgColor}
                        emojiSizeClass="text-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center text-[10px] font-bold text-foreground">
                        {users[0].user.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div className="w-1/2 h-full relative overflow-hidden">
                    {users[1].user.image ? (
                      <img
                        src={users[1].user.image}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : users[1].user.avatarBgColor ? (
                      <IconAvatar
                        emoji={users[1].user.avatarEmoji}
                        bgColor={users[1].user.avatarBgColor}
                        emojiSizeClass="text-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center text-[10px] font-bold text-foreground">
                        {users[1].user.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {users.length === 3 && (
                <div className="flex flex-col w-full h-full gap-[1px]">
                  <div className="flex w-full h-1/2 gap-[1px]">
                    <div className="w-1/2 h-full relative overflow-hidden">
                      {users[0].user.image ? (
                        <img
                          src={users[0].user.image}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : users[0].user.avatarBgColor ? (
                        <IconAvatar
                          emoji={users[0].user.avatarEmoji}
                          bgColor={users[0].user.avatarBgColor}
                          emojiSizeClass="text-xs"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface flex items-center justify-center text-[8px] font-bold text-foreground">
                          {users[0].user.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    <div className="w-1/2 h-full relative overflow-hidden">
                      {users[1].user.image ? (
                        <img
                          src={users[1].user.image}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : users[1].user.avatarBgColor ? (
                        <IconAvatar
                          emoji={users[1].user.avatarEmoji}
                          bgColor={users[1].user.avatarBgColor}
                          emojiSizeClass="text-xs"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface flex items-center justify-center text-[8px] font-bold text-foreground">
                          {users[1].user.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-1/2 relative overflow-hidden">
                    {users[2].user.image ? (
                      <img
                        src={users[2].user.image}
                        className="w-full h-full object-cover object-[center_20%]"
                        alt=""
                      />
                    ) : users[2].user.avatarBgColor ? (
                      <IconAvatar
                        emoji={users[2].user.avatarEmoji}
                        bgColor={users[2].user.avatarBgColor}
                        emojiSizeClass="text-xs"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center text-[8px] font-bold text-foreground">
                        {users[2].user.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {users.length >= 4 && (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-[1px]">
                  {users.map((u, i) => (
                    <div
                      key={i}
                      className="relative w-full h-full overflow-hidden"
                    >
                      {u.user.image ? (
                        <img
                          src={u.user.image}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : u.user.avatarBgColor ? (
                        <IconAvatar
                          emoji={u.user.avatarEmoji}
                          bgColor={u.user.avatarBgColor}
                          emojiSizeClass="text-xs"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface flex items-center justify-center text-[8px] font-bold text-foreground">
                          {u.user.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { Avatar, AvatarFallback, AvatarImage };
