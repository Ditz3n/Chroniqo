// src/app/[locale]/(protected)/communities/[name]/members/(components)/member-card.tsx
"use client";

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
import { Tooltip } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { ExtendedMemberCardProps } from "@/types/app-types";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Ghost,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  User,
  UserMinus,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MemberCard({
  member,
  viewerRole,
  currentUserId,
  onKick,
  onChangeRole,
  onOpenBanMuteModal,
  onUnmute,
  useAnonPreview = false,
  onToggleAnonPreview,
}: ExtendedMemberCardProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "roles">("main");

  const menuItemCls =
    "py-3 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";
  const activeItemCls =
    "py-3 px-4 cursor-pointer rounded-none w-full text-foreground font-medium bg-foreground/5 group/item hover:bg-foreground/5 focus:bg-foreground/5";
  const destructiveMenuItemCls =
    "py-3 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";
  const PANEL_WIDTH = 224;

  const isSelf = member.user.id === currentUserId;

  const isGlobalAdmin = viewerRole === "SYSTEM_ADMIN";
  const isOwner = viewerRole === "OWNER";
  const isAdmin = viewerRole === "ADMIN";
  const isMod = viewerRole === "MODERATOR";

  const targetIsOwner = member.role === "OWNER";
  const targetIsAdmin = member.role === "ADMIN";

  const canManageRoles =
    !isSelf &&
    (isGlobalAdmin || isOwner || (isAdmin && !targetIsOwner && !targetIsAdmin));

  const canKick =
    !isSelf &&
    (isGlobalAdmin ||
      isOwner ||
      (isAdmin && !targetIsOwner && !targetIsAdmin) ||
      (isMod && member.role === "USER"));

  const canMuteBan = canKick;

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    if (!open) {
      setTimeout(() => setMenuView("main"), 250);
    }
  };

  const trackOffset = menuView === "main" ? 0 : -PANEL_WIDTH;
  const roleOptions: Array<{
    value: "USER" | "MODERATOR" | "ADMIN";
    label: string;
    icon: typeof User;
  }> = [
    { value: "USER", label: t("communityPage.role_user"), icon: User },
    {
      value: "MODERATOR",
      label: t("communityPage.role_moderator"),
      icon: Shield,
    },
    { value: "ADMIN", label: t("communityPage.role_admin"), icon: ShieldCheck },
  ];

  const displayName =
    useAnonPreview && member.anonymousIdentity
      ? member.anonymousIdentity.displayName
      : (member.user.name ?? member.user.username);
  const displayUsername =
    useAnonPreview && member.anonymousIdentity
      ? member.anonymousIdentity.username
      : member.user.username;
  const displayImage = useAnonPreview ? null : member.user.image;
  const displayEmoji =
    useAnonPreview && member.anonymousIdentity
      ? member.anonymousIdentity.animalEmoji
      : member.user.avatarEmoji;
  const displayBgColor =
    useAnonPreview && member.anonymousIdentity
      ? member.anonymousIdentity.bgColor
      : member.user.avatarBgColor;

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 bg-surface hover:bg-foreground/5 transition-colors sm:rounded-2xl border-b sm:border border-surface-border sm:mb-3 last:border-b-0 sm:last:border-b cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a, [role='menuitem']")) return;
        if (!displayUsername) return;
        router.push(`/${locale}/u/${encodeURIComponent(displayUsername)}`);
      }}
    >
      <Avatar
        className="h-10 w-10 border border-surface-border ring-2 ring-offset-1 ring-offset-background bg-background"
        style={
          {
            "--tw-ring-color": useAnonPreview
              ? "transparent"
              : getMoodRingColor(member.user.dailyStatuses?.[0]?.value),
          } as React.CSSProperties
        }
      >
        {displayImage && <AvatarImage src={displayImage} />}
        {!displayImage && displayBgColor ? (
          <IconAvatar
            emoji={displayEmoji}
            bgColor={displayBgColor}
            emojiSizeClass="text-2xl"
          />
        ) : (
          <AvatarFallback className="text-xs font-bold text-brand bg-brand/20">
            {displayUsername?.[0]?.toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate group-hover:underline flex items-center gap-1">
            {displayName}
            {!useAnonPreview && member.user.emailVerified && (
              <VerifiedBadge className="h-3.5 w-3.5" />
            )}
          </span>
          {member.anonymousIdentity && onToggleAnonPreview && (
            <Tooltip
              content={t(
                isSelf
                  ? `MessagesPage.toggle_own_anon_identity_${useAnonPreview ? "off" : "on"}`
                  : `MessagesPage.toggle_other_anon_identity_${useAnonPreview ? "off" : "on"}`,
              )}
              side="top"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleAnonPreview(member.user.id);
                }}
                className={cn(
                  "flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-pointer flex-shrink-0",
                  useAnonPreview
                    ? "text-brand bg-brand/10"
                    : "text-foreground-40 hover:text-foreground hover:bg-foreground/5",
                )}
              >
                <Ghost className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          {member.role !== "USER" && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand/80 bg-brand/10 px-1.5 py-0.5 rounded shrink-0">
              {t(`communityPage.role_${member.role.toLowerCase()}`)}
            </span>
          )}
        </div>
        <span className="text-xs text-foreground-60 truncate">
          u/{displayUsername}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {member.isMuted && <VolumeX className="h-4 w-4 text-foreground-40" />}

        {!isSelf && (canKick || canManageRoles || canMuteBan) && (
          <DropdownMenu open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
            <Tooltip content={t("post.more")} side="bottom">
              <DropdownMenuTrigger asChild>
                <button
                  disabled={isLoading}
                  className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-foreground/10 text-foreground-60 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-5 w-5" />
                  )}
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="w-56 overflow-hidden rounded-xl border-surface-border bg-background shadow-xl p-0"
            >
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  width: `${PANEL_WIDTH * 2}px`,
                  transform: `translateX(${trackOffset}px)`,
                }}
              >
                <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
                  {canManageRoles && (
                    <DropdownMenuItem
                      className={cn(menuItemCls, "justify-between")}
                      onSelect={(e) => {
                        e.preventDefault();
                        setMenuView("roles");
                      }}
                    >
                      <div className="flex items-center">
                        <Shield className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
                        <span>{t("communityPage.action_change_role")}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-foreground-40" />
                    </DropdownMenuItem>
                  )}

                  {canManageRoles && (
                    <DropdownMenuSeparator className="bg-surface-border" />
                  )}

                  {canMuteBan && (
                    <>
                      {member.isMuted ? (
                        <DropdownMenuItem
                          onClick={() =>
                            handleAction(() =>
                              onUnmute
                                ? onUnmute(member.user.id)
                                : Promise.resolve(),
                            )
                          }
                          className={menuItemCls}
                        >
                          <VolumeX className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
                          {t("communityPage.unmute")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            onOpenBanMuteModal?.(
                              member.user.id,
                              member.user.username || "Unknown",
                              "mute",
                            )
                          }
                          className={menuItemCls}
                        >
                          <VolumeX className="mr-3 h-5 w-5 text-foreground-60 transition-transform duration-200 group-hover/item:scale-110" />
                          {t("communityPage.action_mute")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          onOpenBanMuteModal?.(
                            member.user.id,
                            member.user.username || "Unknown",
                            "ban",
                          )
                        }
                        className={destructiveMenuItemCls}
                      >
                        <Ban className="mr-3 h-5 w-5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                        {t("communityPage.action_ban")}
                      </DropdownMenuItem>
                    </>
                  )}

                  {canKick && (
                    <DropdownMenuItem
                      onClick={() =>
                        onKick(
                          member.user.id,
                          member.user.username || "Unknown",
                        )
                      }
                      className={destructiveMenuItemCls}
                    >
                      <UserMinus className="mr-3 h-5 w-5 text-brand transition-transform duration-200 group-hover/item:scale-110" />
                      {t("communityPage.action_kick")}
                    </DropdownMenuItem>
                  )}
                </div>

                <div style={{ width: PANEL_WIDTH }} className="flex-shrink-0">
                  <div className="flex items-center border-b border-surface-border">
                    <button
                      onClick={() => setMenuView("main")}
                      className="self-stretch pl-4 pr-3 flex items-center justify-center cursor-pointer flex-shrink-0 transition-transform duration-150 active:scale-95 text-foreground-60"
                    >
                      <ChevronLeft className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
                    </button>
                    <span className="text-sm font-bold text-foreground-60 py-3">
                      {t("communityPage.action_change_role")}
                    </span>
                  </div>

                  {roleOptions.map((role) => {
                    const isActive = member.role === role.value;
                    const Icon = role.icon;
                    return (
                      <DropdownMenuItem
                        key={role.value}
                        className={cn(
                          isActive ? activeItemCls : menuItemCls,
                          "justify-between",
                        )}
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => {
                          if (isActive) return;
                          handleAction(() =>
                            onChangeRole(member.user.id, role.value),
                          );
                        }}
                      >
                        <div className="flex items-center">
                          <Icon
                            className={cn(
                              "mr-3 h-5 w-5 transition-transform duration-200 group-hover/item:scale-110",
                              isActive ? "text-brand" : "text-foreground-60",
                            )}
                          />
                          <span>{role.label}</span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
