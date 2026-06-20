// src/app/[locale]/(protected)/create/(components)/destination-selector.tsx
"use client";

import { SuspendedInfoModal } from "@/components/moderation/suspended-info-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  ApiCommunity,
  CommunitiesOverviewData,
  DestinationSelectorProps,
} from "@/types/app-types";
import { ChevronDown, Lock, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DestinationSelector({
  value,
  onChange,
}: DestinationSelectorProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [suspendedCommunityTrigger, setSuspendedCommunityTrigger] =
    useState<ApiCommunity | null>(null);

  const { data } = useSWR<CommunitiesOverviewData>("/api/communities", fetcher);

  const suspendedCommunities = data?.suspended || [];
  const joinedSuspended = suspendedCommunities.filter((c) => c.isJoined);

  const joinedCommunities = [...(data?.joined || []), ...joinedSuspended];
  const allCommunities = [...(data?.all || []), ...suspendedCommunities];

  // When searching, look through all communities. Otherwise, show joined.
  const displayList =
    search.trim() === ""
      ? joinedCommunities
      : allCommunities.filter((c: ApiCommunity) =>
          c.name.toLowerCase().includes(search.toLowerCase()),
        );

  const username = session?.user?.username || "Profile";
  const displayName = session?.user?.name || username;

  // Enrich the active value with full data since the parent page might only pass the name initially
  const displayValue = { ...value };
  if (displayValue.type === "profile") {
    displayValue.name = username;
    displayValue.image = session?.user?.image;
    displayValue.avatarEmoji = session?.user?.avatarEmoji;
    displayValue.avatarBgColor = session?.user?.avatarBgColor;
  } else if (displayValue.type === "community" && data) {
    const found =
      allCommunities.find((c: ApiCommunity) => c.name === value.name) ||
      joinedCommunities.find((c: ApiCommunity) => c.name === value.name);
    if (found) {
      displayValue.image = found.image;
      displayValue.avatarEmoji = found.avatarEmoji;
      displayValue.avatarBgColor = found.avatarBgColor;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-foreground/5 transition-colors cursor-pointer text-sm font-bold text-foreground text-left w-[200px] max-w-[200px]">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-5 w-5 border border-surface-border bg-background shrink-0">
              {displayValue.image && <AvatarImage src={displayValue.image} />}
              {!displayValue.image && displayValue.avatarBgColor ? (
                <IconAvatar
                  emoji={displayValue.avatarEmoji}
                  bgColor={displayValue.avatarBgColor}
                  emojiSizeClass="text-[10px]"
                />
              ) : (
                <AvatarFallback className="text-[8px] bg-brand/20 text-brand font-bold">
                  {displayValue.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="truncate">
              {displayValue.type === "profile"
                ? `u/${displayValue.name}`
                : `c/${displayValue.name}`}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-foreground-40 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-h-[400px] overflow-y-auto p-2"
      >
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-40" />
          <input
            type="text"
            placeholder={t("createPost.search_communities")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand text-foreground"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        {search.trim() === "" && (
          <DropdownMenuItem
            onClick={() =>
              onChange({
                type: "profile",
                id: null,
                name: username,
                image: session?.user?.image,
                avatarEmoji: session?.user?.avatarEmoji,
                avatarBgColor: session?.user?.avatarBgColor,
              })
            }
            className="flex items-center gap-3 cursor-pointer py-2 px-2"
          >
            <Avatar className="h-6 w-6 border border-surface-border bg-background">
              {session?.user?.image && <AvatarImage src={session.user.image} />}
              {!session?.user?.image && session?.user?.avatarBgColor ? (
                <IconAvatar
                  emoji={session.user.avatarEmoji}
                  bgColor={session.user.avatarBgColor}
                  emojiSizeClass="text-xs"
                />
              ) : (
                <AvatarFallback className="text-[10px] bg-brand/20 text-brand font-bold">
                  {username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-foreground">{displayName}</span>
              <span className="text-xs text-foreground-60">u/{username}</span>
            </div>
          </DropdownMenuItem>
        )}

        {displayList.length > 0 && (
          <>
            {search.trim() === "" && <DropdownMenuSeparator className="my-2" />}
            <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-foreground-40">
              {search.trim() === ""
                ? t("createPost.communities_label")
                : t("MessagesPage.search_results")}
            </div>
            {displayList.map((c: ApiCommunity & { rules?: string[] }) => {
              const isJoined = joinedCommunities.some((jc) => jc.id === c.id);
              const isLocked = c.isPrivate && !isJoined;
              const isSuspended = c.isActive === false;

              return (
                <DropdownMenuItem
                  key={c.id}
                  disabled={isLocked && !isSuspended}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      return;
                    }
                    if (isSuspended) {
                      e.preventDefault();
                      setSuspendedCommunityTrigger(c);
                      return;
                    }
                    onChange({
                      type: "community",
                      id: c.id,
                      name: c.name,
                      image: c.image,
                      avatarEmoji: c.avatarEmoji,
                      avatarBgColor: c.avatarBgColor,
                      rules: c.rules,
                    });
                  }}
                  className={cn(
                    "flex items-center gap-3 py-2 px-2",
                    isLocked
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer",
                  )}
                >
                  <Avatar className="h-6 w-6 border border-surface-border bg-background">
                    {c.image && <AvatarImage src={c.image} />}
                    {!c.image && c.avatarBgColor ? (
                      <IconAvatar
                        emoji={c.avatarEmoji}
                        bgColor={c.avatarBgColor}
                        emojiSizeClass="text-xs"
                      />
                    ) : (
                      <AvatarFallback className="text-[10px] bg-brand/20 text-brand font-bold">
                        {c.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-foreground truncate">
                      {c.name}
                    </span>
                    <span className="text-xs text-foreground-60">
                      c/{c.name.replace(/\s+/g, "")}
                    </span>
                  </div>
                  {isSuspended && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-warning/20 text-warning uppercase shrink-0">
                      {t("communityPage.suspended_badge")}
                    </span>
                  )}
                  {isLocked && !isSuspended && (
                    <Lock className="h-4 w-4 text-foreground-40 shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>

      {suspendedCommunityTrigger && (
        <SuspendedInfoModal
          isOpen={true}
          onClose={() => setSuspendedCommunityTrigger(null)}
          reason={suspendedCommunityTrigger.banReason}
          bannedUntil={suspendedCommunityTrigger.bannedUntil}
        />
      )}
    </DropdownMenu>
  );
}
