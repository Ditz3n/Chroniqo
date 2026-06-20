// src/app/[locale]/(protected)/admin/page.tsx
"use client";

import { ExtendBanModal } from "@/components/moderation/extend-ban-modal";
import { ExtendMuteModal } from "@/components/moderation/extend-mute-modal";
import { GlobalBanModal } from "@/components/moderation/global-ban-modal";
import { RevokeBanModal } from "@/components/moderation/revoke-ban-modal";
import { RevokeMuteModal } from "@/components/moderation/revoke-mute-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { formatMuteTimeLeft } from "@/lib/utils/format-mute-time-left";
import { MOOD_RING_FALLBACK, getMoodRingColor } from "@/lib/utils/mood-ring";
import {
  AdminReportedCommunity,
  AdminReportedUser,
  AdminTab,
  ApiGlobalBan,
  ApiGlobalMute,
} from "@/types/app-types";
import {
  ChevronRight,
  Clock,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { DummyDataGenerator } from "./(components)/dummy-data-generator";
import { StatsOverview } from "./(components)/stats-overview";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Tabs that display a count badge next to their label
const TAB_COUNTS: Partial<
  Record<
    AdminTab,
    (
      data: {
        reportedUsers: AdminReportedUser[];
        reportedCommunities: AdminReportedCommunity[];
      },
      bans: ApiGlobalBan[],
      mutes: ApiGlobalMute[],
    ) => number
  >
> = {
  users: (data) => data.reportedUsers.length,
  communities: (data) => data.reportedCommunities.length,
  banned: (_, bans) => bans.length,
  muted: (_, __, mutes) => mutes.length,
};

export default function AdminDashboardPage() {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [extendBanTarget, setExtendBanTarget] = useState<ApiGlobalBan | null>(
    null,
  );
  const [revokeBanTarget, setRevokeBanTarget] = useState<ApiGlobalBan | null>(
    null,
  );
  const [rebanTarget, setRebanTarget] = useState<ApiGlobalBan | null>(null);
  const [extendMuteTarget, setExtendMuteTarget] =
    useState<ApiGlobalMute | null>(null);
  const [revokeMuteTarget, setRevokeMuteTarget] =
    useState<ApiGlobalMute | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data: reportData, isLoading: reportsLoading } = useSWR(
    "/api/admin/reports",
    fetcher,
  );
  const { data: banData, mutate: mutateBans } = useSWR(
    "/api/admin/bans",
    fetcher,
  );
  const { data: muteData, mutate: mutateMutes } = useSWR(
    "/api/admin/mutes",
    fetcher,
  );

  useEffect(() => {
    if (session && session.user?.role !== "ADMIN") {
      router.replace(`/${locale}/feed`);
    }
  }, [session, router, locale]);

  const { reportedUsers = [], reportedCommunities = [] } = reportData || {};
  const bans: ApiGlobalBan[] = banData?.bans || [];
  const previousBans: ApiGlobalBan[] = banData?.previousBans || [];
  const mutes: ApiGlobalMute[] = muteData?.mutes || [];

  const hasTimedMute = reportedUsers.some(
    (item: { mutedUntil?: string | null }) => !!item.mutedUntil,
  );
  const hasTimedSuspension = reportedCommunities.some(
    (item: { suspendedUntil?: string | null }) => !!item.suspendedUntil,
  );

  useEffect(() => {
    if (!hasTimedMute && !hasTimedSuspension) return;
    const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [hasTimedMute, hasTimedSuspension]);

  if (reportsLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleUnban = async () => {
    if (!revokeBanTarget) return;
    await fetch(`/api/admin/bans?id=${revokeBanTarget.id}`, {
      method: "DELETE",
    });
    mutateBans();
  };

  const handleExtendBan = async (durationHours: number | null) => {
    if (!extendBanTarget) return;
    await fetch("/api/admin/bans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: extendBanTarget.id, durationHours }),
    });
    mutateBans();
  };

  const handleReban = async (reason: string, durationHours: string) => {
    if (!rebanTarget?.user?.username) return;
    const hours = durationHours === "permanent" ? null : Number(durationHours);
    await fetch(`/api/admin/users/${rebanTarget.user.username}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, durationHours: hours }),
    });
    mutateBans();
  };

  const handleUnmute = async () => {
    if (!revokeMuteTarget) return;
    await fetch(`/api/admin/mutes?id=${revokeMuteTarget.id}`, {
      method: "DELETE",
    });
    mutateMutes();
  };

  const handleExtendMute = async (durationHours: number | null) => {
    if (!extendMuteTarget) return;
    await fetch("/api/admin/mutes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: extendMuteTarget.id, durationHours }),
    });
    mutateMutes();
  };

  const cardStyle =
    "flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5 border border-surface-border transition-colors bg-surface rounded-2xl mb-3 cursor-pointer group";

  const sectionHeading = (label: string, count?: number) => (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <span className="text-xs font-bold uppercase tracking-wider text-foreground-40">
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs font-bold bg-foreground/8 text-foreground-60 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );

  const allTabs = [
    "overview",
    "users",
    "communities",
    "banned",
    "muted",
    "dummy",
  ] as const;

  return (
    <div className="flex w-full min-h-full justify-center pb-12 pt-6">
      <div className="flex flex-col w-full max-w-[800px] px-4 sm:px-6 mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-6 w-6 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
              {t("admin.dashboard_title")}
            </h1>
            <p className="text-sm text-foreground-60">
              {t("admin.dashboard_desc")}
            </p>
          </div>
        </div>

        <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-6">
          {allTabs.map((tab) => {
            const countFn = TAB_COUNTS[tab];
            const count = countFn
              ? countFn({ reportedUsers, reportedCommunities }, bans, mutes)
              : undefined;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer capitalize",
                  activeTab === tab
                    ? "border-brand text-foreground"
                    : "border-transparent text-foreground-60 hover:text-foreground",
                )}
              >
                {t(`admin.tab_${tab}`)}
                {count !== undefined && ` (${count})`}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && <StatsOverview />}

          {/* USERS TAB */}
          {activeTab === "users" && reportedUsers.length === 0 && (
            <div className="text-center py-16 text-foreground-40 text-sm font-medium">
              {t("admin.no_user_reports")}
            </div>
          )}
          {activeTab === "users" &&
            reportedUsers.map((item: AdminReportedUser) => (
              <Link
                href={`/${locale}/admin/u/${item.user.username}`}
                key={item.user.id}
                className={cardStyle}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    className="h-10 w-10 shrink-0 border border-surface-border ring-2 ring-offset-1 ring-offset-background bg-background"
                    style={
                      {
                        "--tw-ring-color": getMoodRingColor(
                          item.dailyStatusValue ?? null,
                        ),
                      } as React.CSSProperties
                    }
                  >
                    {item.user.image && <AvatarImage src={item.user.image} />}
                    {!item.user.image && item.user.avatarBgColor ? (
                      <IconAvatar
                        emoji={item.user.avatarEmoji}
                        bgColor={item.user.avatarBgColor}
                        emojiSizeClass="text-2xl"
                      />
                    ) : (
                      <AvatarFallback className="bg-surface text-foreground font-bold">
                        {item.user.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1">
                      {item.user.name || item.user.username}
                      {item.user.emailVerified && (
                        <VerifiedBadge className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="text-xs text-foreground-60 truncate">
                      u/{item.user.username}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.mutedUntil && (
                    <span className="text-xs font-bold bg-warning/15 text-warning px-2.5 py-1 rounded-full whitespace-nowrap">
                      {t("admin.muted_time_left").replace(
                        "{{time}}",
                        formatMuteTimeLeft(item.mutedUntil, nowMs),
                      )}
                    </span>
                  )}
                  <span className="text-xs font-bold bg-warning/20 text-warning px-2.5 py-1 rounded-full whitespace-nowrap">
                    {item.reportCount} {t("admin.reports")}
                  </span>
                  <ChevronRight className="hidden sm:block h-5 w-5 text-foreground-40 group-hover:text-brand transition-colors" />
                </div>
              </Link>
            ))}

          {/* COMMUNITIES TAB */}
          {activeTab === "communities" && reportedCommunities.length === 0 && (
            <div className="text-center py-16 text-foreground-40 text-sm font-medium">
              {t("admin.no_community_reports")}
            </div>
          )}
          {activeTab === "communities" &&
            reportedCommunities.map((item: AdminReportedCommunity) => (
              <Link
                href={`/${locale}/admin/c/${item.community.name}`}
                key={item.community.id}
                className={cardStyle}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 rounded-xl shrink-0 border border-surface-border bg-background overflow-hidden">
                    {item.community.image && (
                      <AvatarImage src={item.community.image} />
                    )}
                    {!item.community.image && item.community.avatarBgColor ? (
                      <IconAvatar
                        emoji={item.community.avatarEmoji}
                        bgColor={item.community.avatarBgColor}
                        emojiSizeClass="text-xl"
                      />
                    ) : (
                      <AvatarFallback className="bg-background rounded-xl">
                        <Users className="h-4 w-4 text-foreground-40" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-foreground truncate">
                      c/{item.community.name}
                    </span>
                    <span className="text-xs text-foreground-60 truncate">
                      {item.community.isPrivate
                        ? t("communityPage.private")
                        : t("communityPage.public")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.isSuspended && (
                    <span className="text-xs font-bold bg-warning/15 text-warning px-2.5 py-1 rounded-full whitespace-nowrap">
                      {item.suspendedUntil
                        ? t("admin.suspended_time_left").replace(
                            "{{time}}",
                            formatMuteTimeLeft(item.suspendedUntil, nowMs),
                          )
                        : t("admin.suspended_permanently_label")}
                    </span>
                  )}
                  <span className="text-xs font-bold bg-warning/20 text-warning px-2.5 py-1 rounded-full whitespace-nowrap">
                    {item.reportCount} {t("admin.reports")}
                  </span>
                  <ChevronRight className="hidden sm:block h-5 w-5 text-foreground-40 group-hover:text-brand transition-colors" />
                </div>
              </Link>
            ))}

          {/* BANNED USERS TAB */}
          {activeTab === "banned" && (
            <>
              {/* Currently Banned */}
              {sectionHeading(t("admin.currently_banned"), bans.length)}
              {bans.length === 0 ? (
                <div className="text-center py-8 text-foreground-40 text-sm font-medium border border-surface-border rounded-2xl mb-6">
                  {t("admin.no_banned_users")}
                </div>
              ) : (
                <div className="mb-6">
                  {bans.map((ban: ApiGlobalBan) => (
                    <div
                      key={ban.id}
                      className={cn(
                        cardStyle,
                        "cursor-default hover:bg-surface flex-col sm:flex-row items-start sm:items-center",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 w-full sm:flex-1">
                        <Avatar
                          className="h-10 w-10 shrink-0 ring-2 ring-offset-1 ring-offset-background bg-background border border-surface-border"
                          style={
                            {
                              "--tw-ring-color": MOOD_RING_FALLBACK,
                            } as React.CSSProperties
                          }
                        >
                          {ban.user?.image && (
                            <AvatarImage src={ban.user.image} />
                          )}
                          {!ban.user?.image && ban.user?.avatarBgColor ? (
                            <IconAvatar
                              emoji={ban.user.avatarEmoji}
                              bgColor={ban.user.avatarBgColor}
                              emojiSizeClass="text-2xl"
                            />
                          ) : (
                            <AvatarFallback className="bg-brand/10 text-xs font-bold text-brand">
                              {ban.user?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-foreground truncate">
                            {ban.user?.username
                              ? `u/${ban.user.username} (${ban.email})`
                              : ban.email}
                          </span>
                          <span className="text-xs text-foreground-60 truncate">
                            {ban.reason || t("admin.no_reason")} •{" "}
                            {ban.expiresAt
                              ? new Date(ban.expiresAt).toLocaleDateString(
                                  locale,
                                )
                              : t("admin.infinite")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end shrink-0">
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => setExtendBanTarget(ban)}
                          className="h-8"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {t("admin.extend_ban")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeBanTarget(ban)}
                          className="h-8"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("admin.unban")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previously Banned */}
              <div className="border-t border-surface-border pt-6">
                {sectionHeading(
                  t("admin.previously_banned"),
                  previousBans.length,
                )}
                {previousBans.length === 0 ? (
                  <div className="text-center py-8 text-foreground-40 text-sm font-medium border border-surface-border rounded-2xl">
                    {t("admin.no_previously_banned")}
                  </div>
                ) : (
                  previousBans.map((ban: ApiGlobalBan) => (
                    <div
                      key={ban.id}
                      className={cn(
                        cardStyle,
                        "cursor-default hover:bg-surface flex-col sm:flex-row items-start sm:items-center opacity-70",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 w-full sm:flex-1">
                        <Avatar
                          className="h-10 w-10 shrink-0 ring-2 ring-offset-1 ring-offset-background bg-background border border-surface-border"
                          style={
                            {
                              "--tw-ring-color": MOOD_RING_FALLBACK,
                            } as React.CSSProperties
                          }
                        >
                          {ban.user?.image && (
                            <AvatarImage src={ban.user.image} />
                          )}
                          {!ban.user?.image && ban.user?.avatarBgColor ? (
                            <IconAvatar
                              emoji={ban.user.avatarEmoji}
                              bgColor={ban.user.avatarBgColor}
                              emojiSizeClass="text-2xl"
                            />
                          ) : (
                            <AvatarFallback className="bg-foreground/8 text-xs font-bold text-foreground-40">
                              {ban.user?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {ban.user?.username
                                ? `u/${ban.user.username} (${ban.email})`
                                : ban.email}
                            </span>
                            {!ban.user && (
                              <span className="text-xs font-medium text-foreground-40 shrink-0">
                                {t("admin.deleted_account")}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-foreground-60 truncate">
                            {ban.reason || t("admin.no_reason")}
                          </span>
                        </div>
                      </div>
                      {/* Re-ban is only available when the user's account still exists */}
                      {ban.user?.username && (
                        <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end shrink-0">
                          <Button
                            variant="brand"
                            size="sm"
                            onClick={() => setRebanTarget(ban)}
                            className="h-8"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t("admin.reban_user")}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* MUTED USERS TAB */}
          {activeTab === "muted" && (
            <>
              {mutes.length === 0 ? (
                <div className="text-center py-16 text-foreground-40 text-sm font-medium">
                  {t("admin.no_muted_users")}
                </div>
              ) : (
                mutes.map((mute: ApiGlobalMute) => (
                  <div
                    key={mute.id}
                    className={cn(
                      cardStyle,
                      "cursor-default hover:bg-surface flex-col sm:flex-row items-start sm:items-center",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 w-full sm:flex-1">
                      <Avatar
                        className="h-10 w-10 shrink-0 ring-2 ring-offset-1 ring-offset-background bg-background border border-surface-border"
                        style={
                          {
                            "--tw-ring-color": MOOD_RING_FALLBACK,
                          } as React.CSSProperties
                        }
                      >
                        {mute.user?.image && (
                          <AvatarImage src={mute.user.image} />
                        )}
                        {!mute.user?.image && mute.user?.avatarBgColor ? (
                          <IconAvatar
                            emoji={mute.user.avatarEmoji}
                            bgColor={mute.user.avatarBgColor}
                            emojiSizeClass="text-2xl"
                          />
                        ) : (
                          <AvatarFallback className="bg-warning/10 text-xs font-bold text-warning">
                            {mute.user?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-foreground truncate flex items-center gap-1">
                          {mute.user?.username
                            ? `u/${mute.user.username} (${mute.user.email})`
                            : (mute.user?.email ?? "-")}
                          {mute.user && mute.user.emailVerified && (
                            <VerifiedBadge className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="text-xs text-foreground-60 truncate">
                          {mute.reason || t("admin.no_reason")} •{" "}
                          {mute.expiresAt
                            ? new Date(mute.expiresAt).toLocaleDateString(
                                locale,
                              )
                            : t("admin.infinite")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end shrink-0">
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => setExtendMuteTarget(mute)}
                        className="h-8"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {t("admin.extend_mute")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokeMuteTarget(mute)}
                        className="h-8"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("admin.revoke_mute_confirm")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* DUMMY DATA TAB */}
          {activeTab === "dummy" && <DummyDataGenerator />}
        </div>
      </div>

      <ExtendBanModal
        isOpen={!!extendBanTarget}
        onClose={() => setExtendBanTarget(null)}
        onConfirm={handleExtendBan}
        targetIdentifier={
          extendBanTarget?.user?.username || extendBanTarget?.email || ""
        }
        currentExpiration={extendBanTarget?.expiresAt || null}
      />
      <RevokeBanModal
        isOpen={!!revokeBanTarget}
        onClose={() => setRevokeBanTarget(null)}
        onConfirm={handleUnban}
        targetEmail={revokeBanTarget?.email || ""}
        targetUsername={revokeBanTarget?.user?.username}
      />

      {/* Re-ban reuses GlobalBanModal - the ban endpoint does an upsert so it handles both new and existing records */}
      <GlobalBanModal
        isOpen={!!rebanTarget}
        onClose={() => setRebanTarget(null)}
        onConfirm={handleReban}
        username={rebanTarget?.user?.username || ""}
      />

      <ExtendMuteModal
        isOpen={!!extendMuteTarget}
        onClose={() => setExtendMuteTarget(null)}
        onConfirm={handleExtendMute}
        targetIdentifier={extendMuteTarget?.user?.username ?? ""}
        currentExpiration={extendMuteTarget?.expiresAt ?? null}
      />

      <RevokeMuteModal
        isOpen={!!revokeMuteTarget}
        onClose={() => setRevokeMuteTarget(null)}
        onConfirm={handleUnmute}
        targetUsername={revokeMuteTarget?.user?.username}
      />
    </div>
  );
}
