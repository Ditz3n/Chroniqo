// src/app/[locale]/(protected)/(components)/top-navbar.tsx
"use client";

import { ChroniqoLogo } from "@/app/(components)/chroniqo-logo";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useDailyStatus } from "@/context/daily-status-context";
import { DAILY_STATUSES } from "@/lib/constants";
import { useTodayStatus } from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { SearchBar } from "./search-bar";

export function TopNavbar() {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // SWR poll - used as initial fallback only
  const { data: todayData } = useTodayStatus();
  const myStatus = todayData?.status;

  // Context value updates instantly on registration; SWR is the fallback
  // for the brief window before DailyStatusContext finishes its own fetch.
  const { currentValue } = useDailyStatus();
  const activeMoodValue = currentValue ?? myStatus?.value ?? null;

  const currentMoodColor =
    activeMoodValue !== null
      ? DAILY_STATUSES[activeMoodValue].color
      : "var(--color-surface-border)";

  const userInitial =
    session?.user?.username?.[0]?.toUpperCase() ||
    session?.user?.name?.[0]?.toUpperCase() ||
    "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/95 backdrop-blur-md overflow-x-hidden">
      <div className="flex h-16 items-center px-4 justify-between gap-4">
        {/* Left: Logo */}
        <div
          className={`flex items-center flex-shrink-0 transition-opacity duration-300 ease-in-out md:!w-[240px] md:!opacity-100 md:pointer-events-auto w-[36px] ${
            isSearchFocused ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Tooltip
            content={t("nav.home")}
            side="bottom"
            sideOffset={6}
            className="md:hidden z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          >
            <Link
              href={`/${locale}/feed`}
              className="flex items-center gap-3 cursor-pointer group"
            >
              {/* Inline SVG logo */}
              <div className="transition-transform group-hover:scale-105">
                <ChroniqoLogo
                  width={36}
                  height={36}
                  className="text-foreground"
                />
              </div>
              <span className="hidden md:inline-block font-heading font-extrabold text-xl tracking-tight text-foreground">
                {t("navBar.logo_prefix") || "Chroni"}
                <span className="text-brand transition-colors duration-500">
                  {t("navBar.logo_accent") || "q"}
                </span>
                {t("navBar.logo_suffix") || "o"}
              </span>
            </Link>
          </Tooltip>
        </div>

        {/* Center: Search */}
        <div
          className={`flex-1 flex justify-center min-w-0 px-0 md:max-w-2xl md:mx-auto relative z-10 transition-all duration-300 ease-in-out ${
            isSearchFocused ? "-ml-[52px] -mr-[144px] md:ml-0 md:mr-0" : ""
          }`}
        >
          <SearchBar onFocusChange={setIsSearchFocused} />
        </div>

        {/* Right: Actions */}
        <div
          className={`flex items-center justify-end gap-1 md:gap-2 flex-shrink-0 transition-opacity duration-300 ease-in-out md:!w-[240px] md:!opacity-100 md:pointer-events-auto w-[128px] ${
            isSearchFocused ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Tooltip content={t("topNavbar.create_post")} side="bottom">
            <Link
              href={`/${locale}/create`}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-foreground/5 text-foreground transition-colors cursor-pointer"
              aria-label={t("topNavbar.create_post")}
            >
              <Plus size={22} />
            </Link>
          </Tooltip>

          <NotificationsDropdown />

          <Tooltip content={t("topNavbar.profile")} side="bottom">
            <Link
              href={`/${locale}/u/${session?.user?.username}`}
              aria-label={t("topNavbar.profile")}
              className="ml-1 md:ml-2 flex items-center justify-center h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Avatar
                className="h-8 w-8 border border-surface-border shadow-sm bg-background transition-all duration-500 ring-2 ring-offset-2 ring-offset-background"
                style={
                  { "--tw-ring-color": currentMoodColor } as React.CSSProperties
                }
              >
                <AvatarImage
                  src={session?.user?.image || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="flex h-full w-full items-center justify-center bg-surface text-foreground font-bold text-xs p-0 overflow-hidden">
                  {session?.user?.avatarBgColor && !session?.user?.image ? (
                    <IconAvatar
                      emoji={session.user.avatarEmoji}
                      bgColor={session.user.avatarBgColor}
                      emojiSizeClass="text-xl"
                    />
                  ) : (
                    userInitial
                  )}
                </AvatarFallback>
              </Avatar>
            </Link>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
