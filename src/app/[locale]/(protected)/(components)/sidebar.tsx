// src/app/[locale]/(protected)/(components)/sidebar.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
// Raw tooltip primitives are used for controlled DropdownMenu combos - the <Tooltip>
// wrapper cannot be used here because Radix DropdownMenu (controlled) intercepts
// pointer events before they reach an inner TooltipRoot.
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDailyStatus } from "@/context/daily-status-context";
import { useConversations } from "@/lib/hooks/use-chat";
import { useTheme } from "@/lib/hooks/use-theme";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { applyBrandColor } from "@/lib/utils/branding";
import { ApiConversation } from "@/types/app-types";
import {
  CalendarDays,
  CheckCircle,
  ChevronLeftIcon,
  ChevronRight,
  Globe,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Settings,
  ShieldAlert,
  SmilePlus,
  Sparkles,
  Sun,
  Users,
  XCircle,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";

// Style constants

const menuItemCls =
  "py-3 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";

const menuItemClsNoColor =
  "py-3 px-4 cursor-pointer rounded-none w-full font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";

const activeItemCls =
  "py-3 px-4 cursor-pointer rounded-none w-full text-foreground font-medium bg-foreground/5 group/item hover:bg-foreground/5 focus:bg-foreground/5";

const navLinkCls = (isActive: boolean) =>
  cn(
    "flex items-center rounded-xl h-14 group cursor-pointer overflow-hidden transition-all duration-200 w-full px-0 border",
    isActive
      ? "bg-surface text-foreground font-bold border-surface-border"
      : "text-foreground-60 hover:bg-foreground/5 border-transparent",
  );

// Shared inner layout for nav items

function SidebarItemInner({
  icon: Icon,
  label,
  isExpanded,
  isActive = false,
}: {
  icon: React.ElementType;
  label: string;
  isExpanded: boolean;
  isActive?: boolean;
}) {
  return (
    <div className="flex items-center w-full h-full relative">
      <div
        className="absolute w-14 h-14 flex items-center justify-center flex-shrink-0"
        style={{ left: "-1px" }}
      >
        <Icon
          className={cn(
            "size-6 transition-transform duration-200 group-hover:scale-110",
            isActive && "text-brand",
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </div>
      <span
        className={cn(
          "absolute left-14 text-base font-medium whitespace-nowrap transition-all duration-300 pl-2 truncate",
          !isExpanded ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100",
        )}
      >
        {label}
      </span>
    </div>
  );
}

// Cookie helper (outside component to avoid hooks linting issues)

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
}

// Sub-header

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center border-b border-surface-border">
      <button
        onClick={onBack}
        className="self-stretch pl-4 pr-3 flex items-center justify-center cursor-pointer flex-shrink-0 transition-transform duration-150 active:scale-95 text-foreground-60"
      >
        <ChevronLeftIcon className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
      </button>
      <span className="text-sm font-bold text-foreground-60 py-3">{title}</span>
    </div>
  );
}

// Types

type MoreSubmenuView = "main" | "theme" | "language" | "debug-interceptor";
type MoreLastSubmenu = "theme" | "language" | "debug-interceptor";

interface DebugProps {
  debugForceOpen: () => void;
  debugTestSuccess: () => void;
  debugTestFailure: () => void;
  closeMenu: () => void;
}

// More menu

function MoreMenuContent({
  submenuView,
  setSubmenuView,
  lastSubmenu,
  setLastSubmenu,
  PANEL_WIDTH,
  theme,
  setTheme,
  locale,
  t,
  switchLanguage,
  debugProps,
}: {
  submenuView: MoreSubmenuView;
  setSubmenuView: (v: MoreSubmenuView) => void;
  lastSubmenu: MoreLastSubmenu;
  setLastSubmenu: (v: MoreLastSubmenu) => void;
  PANEL_WIDTH: number;
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
  locale: string;
  t: (key: string) => string;
  switchLanguage: (lang: string) => void;
  debugProps?: DebugProps;
}) {
  const trackOffset = submenuView === "main" ? 0 : -PANEL_WIDTH;

  return (
    <div
      className="flex transition-transform duration-300 ease-in-out"
      style={{
        width: `${PANEL_WIDTH * 2}px`,
        transform: `translateX(${trackOffset}px)`,
      }}
    >
      {/* Panel 0: Main */}
      <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
        <div className="px-4 pt-2 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-60">
            {t("nav.more")}
          </span>
        </div>
        <DropdownMenuItem className={cn(menuItemCls, "justify-between")}>
          <div className="flex items-center">
            <Settings className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
            <span>{t("nav.settings")}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(menuItemCls, "justify-between")}
          onSelect={(e) => {
            e.preventDefault();
            setSubmenuView("theme");
            setLastSubmenu("theme");
          }}
        >
          <div className="flex items-center">
            <Moon className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
            <span>{t("nav.appearance")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-foreground-40" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(menuItemCls, "justify-between")}
          onSelect={(e) => {
            e.preventDefault();
            setSubmenuView("language");
            setLastSubmenu("language");
          }}
        >
          <div className="flex items-center">
            <Globe className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
            <span>{t("nav.language")}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-foreground-40" />
        </DropdownMenuItem>

        {/* Debug section */}
        {debugProps && (
          <>
            <DropdownMenuSeparator className="bg-surface-border" />
            <div className="px-4 pt-2 pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                {t("debug.title")}
              </span>
            </div>
            <DropdownMenuItem
              className={cn(menuItemCls, "justify-between")}
              onSelect={(e) => {
                e.preventDefault();
                setSubmenuView("debug-interceptor");
                setLastSubmenu("debug-interceptor");
              }}
            >
              <div className="flex items-center">
                <SmilePlus className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
                <span>{t("debug.interceptor")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-foreground-40" />
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-surface-border" />
        <DropdownMenuItem
          onClick={() => {
            applyBrandColor(null);
            signOut({ callbackUrl: `/${locale}` });
          }}
          className={cn(menuItemCls, "justify-between text-brand! font-bold")}
        >
          <div className="flex items-center">
            <LogOut
              className="mr-3 h-5 w-5 text-brand transition-transform duration-200 group-hover/item:scale-110"
              strokeWidth={2.5}
            />
            <span>{t("nav.logout")}</span>
          </div>
        </DropdownMenuItem>
      </div>

      {/* Panel 1: Submenus */}
      <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0 relative">
        {/* Theme panel */}
        <div
          style={{
            position: lastSubmenu === "theme" ? "relative" : "absolute",
            top: 0,
            width: "100%",
            visibility: lastSubmenu === "theme" ? "visible" : "hidden",
          }}
        >
          <SubHeader
            title={t("nav.appearance")}
            onBack={() => setSubmenuView("main")}
          />
          {(["light", "dark", "system"] as const).map((t_) => {
            const isActive = theme === t_;
            const Icon = t_ === "light" ? Sun : t_ === "dark" ? Moon : Monitor;
            return (
              <DropdownMenuItem
                key={t_}
                onClick={() => setTheme(t_)}
                className={cn(
                  isActive ? activeItemCls : menuItemCls,
                  "justify-between",
                )}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-center">
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110",
                      isActive ? "text-brand" : "text-foreground-60",
                    )}
                  />
                  <span>{t(`nav.${t_}`)}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        {/* Language panel */}
        <div
          style={{
            position: lastSubmenu === "language" ? "relative" : "absolute",
            top: 0,
            width: "100%",
            visibility: lastSubmenu === "language" ? "visible" : "hidden",
          }}
        >
          <SubHeader
            title={t("nav.language")}
            onBack={() => setSubmenuView("main")}
          />
          {(["en", "da"] as const).map((lang) => {
            const isActive = locale === lang;
            return (
              <DropdownMenuItem
                key={lang}
                onClick={() => switchLanguage(lang)}
                className={cn(
                  isActive ? activeItemCls : menuItemCls,
                  "justify-between",
                )}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-center">
                  <div className="mr-3 transition-transform duration-200 group-hover/item:scale-110">
                    <Image
                      src={lang === "en" ? "/flag-en.svg" : "/flag-dk.svg"}
                      alt={lang === "en" ? "English flag" : "Danish flag"}
                      width={20}
                      height={20}
                      className="rounded-sm"
                    />
                  </div>
                  <span>{t(lang === "en" ? "nav.english" : "nav.danish")}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        {/* Debug interceptor panel */}
        {debugProps && (
          <div
            style={{
              position:
                lastSubmenu === "debug-interceptor" ? "relative" : "absolute",
              top: 0,
              width: "100%",
              visibility:
                lastSubmenu === "debug-interceptor" ? "visible" : "hidden",
            }}
          >
            <SubHeader
              title={t("debug.interceptor")}
              onBack={() => setSubmenuView("main")}
            />
            <DropdownMenuItem
              className={menuItemCls}
              onSelect={(e) => {
                e.preventDefault();
                debugProps.closeMenu();
                debugProps.debugForceOpen();
              }}
            >
              <div className="flex items-center">
                <SmilePlus className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
                <span>{t("debug.open_modal")}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={menuItemClsNoColor}
              onSelect={(e) => {
                e.preventDefault();
                debugProps.closeMenu();
                debugProps.debugTestSuccess();
              }}
            >
              <div className="flex items-center">
                <CheckCircle
                  className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110"
                  style={{ color: "var(--feedback-success)" }}
                />
                <span style={{ color: "var(--feedback-success)" }}>
                  {t("debug.test_success")}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={menuItemClsNoColor}
              onSelect={(e) => {
                e.preventDefault();
                debugProps.closeMenu();
                debugProps.debugTestFailure();
              }}
            >
              <div className="flex items-center">
                <XCircle
                  className="mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110"
                  style={{ color: "var(--feedback-error)" }}
                />
                <span style={{ color: "var(--feedback-error)" }}>
                  {t("debug.test_failure")}
                </span>
              </div>
            </DropdownMenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

// Sidebar

export function Sidebar() {
  const {
    hasRegistered,
    isChecking,
    currentValue,
    debugForceOpen,
    debugTestSuccess,
    debugTestFailure,
  } = useDailyStatus();
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();

  // More menu state (shared between desktop + mobile, types expanded for debug panels)
  const [submenuView, setSubmenuView] = useState<MoreSubmenuView>("main");
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastSubmenu, setLastSubmenu] = useState<MoreLastSubmenu>("theme");

  const PANEL_WIDTH = 256;
  const pathSegments = pathname
    .replace(`/${locale}`, "")
    .split("/")
    .filter(Boolean);

  const isUserProfileRoute =
    pathSegments[0] === "u" &&
    (pathSegments.length === 2 ||
      pathSegments[2] === "friends" ||
      pathSegments[2] === "settings");

  const isExpanded =
    pathname === `/${locale}/feed` ||
    isUserProfileRoute ||
    pathname === `/${locale}/profile`;

  const { data: convData } = useConversations();
  const allConversations = [
    ...(convData?.conversations || []),
    ...(convData?.communityConversations || []).filter((c: ApiConversation) =>
      c.participants.some(
        (p: ApiConversation["participants"][number]) =>
          p.user.id === session?.user?.id,
      ),
    ),
  ];

  // Calculate total unread count excluding muted chats
  const totalUnread = allConversations.reduce((acc, c) => {
    const me = c.participants.find(
      (p: ApiConversation["participants"][number]) =>
        p.user.id === session?.user?.id,
    );
    if (me?.isMuted) return acc;
    return acc + (c.unreadCount || 0);
  }, 0);

  // Status 0 and 1 correspond to the two lowest energy levels
  const isLowEnergy = currentValue !== null && currentValue <= 1;

  const navItems = [
    { href: `/${locale}/feed`, icon: Home, label: t("nav.home") },
    {
      href: `/${locale}/communities`,
      icon: Users,
      label: t("nav.communities"),
    },
    {
      href: `/${locale}/messages`,
      icon: MessageCircle,
      label: t("nav.messages"),
    },
    {
      href: `/${locale}/niqo`,
      icon: Sparkles,
      label: t("niqo.title"),
    },
    {
      href: `/${locale}/daily-status`,
      icon: CalendarDays,
      label: t("nav.daily_status"),
    },
    ...(session?.user?.role === "ADMIN"
      ? [
          {
            href: `/${locale}/admin`,
            icon: ShieldAlert,
            label: t("nav.admin"),
          },
        ]
      : []),
  ];

  const switchLanguage = (newLocale: string) => {
    if (locale === newLocale) return;
    setLocaleCookie(newLocale);
    router.push(pathname.replace(`/${locale}`, `/${newLocale}`));
  };

  const handleDesktopMenuOpenChange = (open: boolean) => {
    setIsDesktopMenuOpen(open);
    if (!open) setTimeout(() => setSubmenuView("main"), 300);
  };

  const handleMobileMenuOpenChange = (open: boolean) => {
    setIsMobileMenuOpen(open);
    if (!open) setTimeout(() => setSubmenuView("main"), 300);
  };

  const sharedMoreProps = {
    submenuView,
    setSubmenuView,
    lastSubmenu,
    setLastSubmenu,
    PANEL_WIDTH,
    theme,
    setTheme,
    locale,
    t,
    switchLanguage,
  };

  const desktopDebugProps: DebugProps = {
    debugForceOpen,
    debugTestSuccess,
    debugTestFailure,
    closeMenu: () => setIsDesktopMenuOpen(false),
  };

  const mobileDebugProps: DebugProps = {
    debugForceOpen,
    debugTestSuccess,
    debugTestFailure,
    closeMenu: () => setIsMobileMenuOpen(false),
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 flex flex-col overflow-hidden h-[calc(100vh-4rem)] border-r border-surface-border bg-background transition-[width] duration-300 ease-in-out w-0",
          isExpanded ? "md:w-64" : "md:w-[88px]",
        )}
      >
        <div className="flex flex-col flex-1 h-full">
          {/* Main nav with custom scroll area */}
          <ScrollArea className="flex-1 py-4 px-4">
            <nav className="space-y-3">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Tooltip
                    key={item.href}
                    content={!isExpanded ? item.label : undefined}
                    side="right"
                  >
                    <Link href={item.href} className={navLinkCls(isActive)}>
                      <div className="flex items-center w-full h-full relative">
                        <div
                          className="absolute w-14 h-14 flex items-center justify-center flex-shrink-0"
                          style={{ left: "-1px" }}
                        >
                          <div className="relative">
                            <item.icon
                              className={cn(
                                "size-6 transition-transform duration-200 group-hover:scale-110",
                                isActive && "text-brand",
                              )}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            {item.href.endsWith("/daily-status") &&
                              !hasRegistered &&
                              !isChecking && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand border-2 border-background" />
                              )}
                            {item.href.endsWith("/messages") &&
                              totalUnread > 0 &&
                              !isLowEnergy && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white border-2 border-background">
                                  {totalUnread > 99 ? "99+" : totalUnread}
                                </span>
                              )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "absolute left-14 text-base font-medium whitespace-nowrap transition-all duration-300 pl-2 truncate",
                            !isExpanded
                              ? "opacity-0 scale-x-0"
                              : "opacity-100 scale-x-100",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  </Tooltip>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Bottom: More */}
          <div className="p-4 flex-shrink-0">
            {/* More button (desktop) - uses raw primitives for controlled DropdownMenu */}
            <TooltipRoot delayDuration={300}>
              <DropdownMenu
                open={isDesktopMenuOpen}
                onOpenChange={handleDesktopMenuOpenChange}
              >
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center h-14 w-full px-0 rounded-xl cursor-pointer overflow-hidden transition-all duration-200 group text-foreground-60 hover:bg-foreground/5 data-[state=open]:bg-surface data-[state=open]:text-foreground data-[state=open]:border-surface-border border border-transparent">
                      <SidebarItemInner
                        icon={Menu}
                        label={t("nav.more")}
                        isExpanded={isExpanded}
                      />
                    </div>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  className="w-64 rounded-xl mb-2 ml-4 border-surface-border bg-background shadow-xl overflow-hidden"
                >
                  <MoreMenuContent
                    {...sharedMoreProps}
                    debugProps={desktopDebugProps}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipPortal>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                >
                  {t("nav.more")}
                  <TooltipArrow className="fill-foreground" />
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation*/}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-surface-border bg-background px-2 py-3 md:hidden">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip
              key={item.href}
              content={item.label}
              side="top"
              sideOffset={12}
              className="z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            >
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  isActive ? "text-brand" : "text-foreground-60",
                )}
              >
                <div className="relative">
                  <item.icon
                    className={cn("h-6 w-6", isActive && "stroke-[2.5px]")}
                  />
                  {item.href.endsWith("/daily-status") &&
                    !hasRegistered &&
                    !isChecking && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand border-2 border-background" />
                    )}
                  {item.href.endsWith("/messages") &&
                    totalUnread > 0 &&
                    !isLowEnergy && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white border-2 border-background">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                </div>
              </Link>
            </Tooltip>
          );
        })}

        {/* Mobile More - uses raw primitives for controlled DropdownMenu */}
        <TooltipRoot delayDuration={300}>
          <DropdownMenu
            open={isMobileMenuOpen}
            onOpenChange={handleMobileMenuOpenChange}
            modal={false}
          >
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center justify-center gap-1 text-foreground-60 outline-none focus:outline-none cursor-pointer">
                  <Menu className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-64 rounded-xl mb-2 mr-2 border-surface-border bg-background shadow-xl overflow-hidden"
            >
              <MoreMenuContent
                {...sharedMoreProps}
                debugProps={mobileDebugProps}
              />
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipPortal>
            <TooltipContent
              side="top"
              sideOffset={12}
              className="z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            >
              {t("nav.more")}
              <TooltipArrow className="fill-foreground" />
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </nav>
    </>
  );
}
