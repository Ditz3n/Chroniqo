// src/app/[locale]/(protected)/admin/u/[username]/page.tsx
"use client";

import { AdminWarnModal } from "@/components/moderation/admin-warn-modal";
import { ClearUserReportsModal } from "@/components/moderation/clear-user-reports-modal";
import { GlobalBanModal } from "@/components/moderation/global-ban-modal";
import { GlobalMuteModal } from "@/components/moderation/global-mute-modal";
import { MutedInfoModal } from "@/components/moderation/muted-info-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format-date";
import { formatMuteTimeLeft } from "@/lib/utils/format-mute-time-left";
import { getMoodRingColor } from "@/lib/utils/mood-ring";
import { AdminReportItem, ApiAdminWarning } from "@/types/app-types";
import {
  ArrowLeft,
  Ban,
  Eye,
  EyeOff,
  MicOff,
  MoreHorizontal,
  ShieldAlert,
  Trash2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminUserReportsPage() {
  const { t, locale } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isClearReportsModalOpen, setIsClearReportsModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
  const [isMutedInfoModalOpen, setIsMutedInfoModalOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data, isLoading, mutate } = useSWR(
    username ? `/api/admin/reports/users/${username}` : null,
    fetcher,
  );

  const { data: muteStatusData, mutate: mutateMute } = useSWR(
    username ? `/api/admin/users/${username}/mute` : null,
    fetcher,
  );
  const activeMute = muteStatusData?.mute ?? null;

  useEffect(() => {
    if (!activeMute?.expiresAt) return;

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeMute?.expiresAt]);

  const handleClearReports = async () => {
    setIsLoadingAction(true);
    try {
      await fetch(`/api/admin/reports/users/${username}`, { method: "DELETE" });
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleClearReportsSuccess = () => {
    router.push(`/${locale}/admin`);
  };

  const handleBanSubmit = async (reason: string, durationHours: string) => {
    const hours = durationHours === "permanent" ? null : Number(durationHours);
    const res = await fetch(`/api/admin/users/${username}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, durationHours: hours }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || t("admin.ban_failed"));
    // Redis ban flag is set server-side in the ban endpoint.
    // BanWatcher on the user's browser detects it within 30 seconds.
  };

  const handleBanSuccess = () => {
    router.push(`/${locale}/admin`);
  };

  const handleMuteSubmit = async (reason: string, durationHours: string) => {
    const hours = durationHours === "permanent" ? null : Number(durationHours);
    await fetch(`/api/admin/users/${username}/mute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, durationHours: hours }),
    });
    // mutateMute() moved to onClose - calling it here would update activeMute
    // mid-animation, changing initialReason and re-triggering the modal's useEffect.
  };

  const handleLiftMute = async () => {
    await fetch(`/api/admin/users/${username}/mute`, {
      method: "DELETE",
    });
    // same reason as above
  };

  const handleWarnSubmit = async () => {
    await fetch(`/api/admin/users/${username}/warn`, { method: "POST" });
    mutate();
  };

  const handleClearWarningHistory = async () => {
    setIsLoadingAction(true);
    try {
      await fetch(`/api/admin/users/${username}/warnings`, {
        method: "DELETE",
      });
      mutate();
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteWarning = async (warningId: string) => {
    mutate((currentData: { warnings: ApiAdminWarning[] } | undefined) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        warnings: currentData.warnings.filter(
          (w: ApiAdminWarning) => w.id !== warningId,
        ),
      };
    }, false);

    try {
      await fetch(`/api/admin/warnings/${warningId}`, { method: "DELETE" });
      mutate();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    mutate();
  };

  const handleToggleSuppress = async (reportId: string, current: boolean) => {
    await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSuppressed: !current }),
    });
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  const { targetUser, reports = [], warnings = [] } = data || {};
  const activeReports = reports.filter(
    (r: AdminReportItem) => !r.isSuppressed,
  ).length;

  return (
    <div className="flex w-full min-h-full justify-center pb-12 pt-6">
      <div className="flex flex-col w-full max-w-[800px] px-4 sm:px-6 mx-auto">
        <Link
          href={`/${locale}/admin`}
          className="inline-flex items-center gap-1 text-sm font-bold text-foreground-60 hover:text-foreground transition-colors w-fit mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.back_to_dashboard")}
        </Link>

        {targetUser && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface border border-surface-border rounded-2xl mb-8">
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/u/${targetUser.username}`}
                className="cursor-pointer"
                tabIndex={0}
                aria-label={`Go to user u/${targetUser.username}`}
              >
                <Avatar
                  className="h-16 w-16 border border-surface-border bg-background ring-2 ring-offset-2 ring-offset-background"
                  style={
                    {
                      "--tw-ring-color": getMoodRingColor(
                        data?.dailyStatusValue ?? null,
                      ),
                    } as React.CSSProperties
                  }
                >
                  {targetUser.image && <AvatarImage src={targetUser.image} />}
                  {!targetUser.image && targetUser.avatarBgColor ? (
                    <IconAvatar
                      emoji={targetUser.avatarEmoji}
                      bgColor={targetUser.avatarBgColor}
                      emojiSizeClass="text-4xl"
                    />
                  ) : (
                    <AvatarFallback className="bg-surface text-foreground font-bold text-xl">
                      {targetUser.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/${locale}/u/${targetUser.username}`}
                    className="group cursor-pointer w-fit flex items-center gap-1.5"
                    tabIndex={0}
                    aria-label={`Go to user u/${targetUser.username}`}
                  >
                    <h2 className="text-xl font-bold text-foreground group-hover:underline">
                      {targetUser.name || targetUser.username}
                    </h2>
                    {targetUser.emailVerified && (
                      <VerifiedBadge className="h-5 w-5" />
                    )}
                  </Link>
                  {activeMute && (
                    <button
                      onClick={() => setIsMutedInfoModalOpen(true)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning uppercase hover:bg-warning/30 transition-colors cursor-pointer"
                    >
                      {t("admin.tab_muted")}
                    </button>
                  )}
                </div>
                <Link
                  href={`/${locale}/u/${targetUser.username}`}
                  className="text-sm text-foreground-60 group-hover:underline w-fit"
                >
                  u/{targetUser.username}
                </Link>
                <span className="text-xs font-semibold text-warning mt-1">
                  {activeReports} {t("admin.active_reports")}
                </span>
                {activeMute && (
                  <span className="text-xs font-bold bg-warning/20 text-warning px-2.5 py-1 rounded-full mt-1 w-fit">
                    {activeMute.expiresAt
                      ? t("admin.muted_time_left").replace(
                          "{{time}}",
                          formatMuteTimeLeft(activeMute.expiresAt, nowMs),
                        )
                      : t("admin.muted_permanently_label")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => setIsClearReportsModalOpen(true)}
                disabled={isLoadingAction}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" /> {t("admin.clear_reports")}
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => setIsWarnModalOpen(true)}
                disabled={isLoadingAction}
                className="gap-2"
              >
                <VolumeX className="h-4 w-4" /> {t("admin.warn_user_global")}
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => setIsMuteModalOpen(true)}
                disabled={isLoadingAction}
                className="gap-2"
              >
                <MicOff className="h-4 w-4" />{" "}
                {activeMute ? t("admin.update_mute") : t("admin.mute_user")}
              </Button>
              <Button
                variant="brand"
                onClick={() => setIsBanModalOpen(true)}
                disabled={isLoadingAction}
                className="gap-2"
              >
                <Ban className="h-4 w-4" /> {t("admin.ban_user")}
              </Button>
            </div>
          </div>
        )}

        {/* Warning History */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground-40">
              {t("admin.warning_history")}
            </h3>
            {warnings.length > 0 && (
              <button
                onClick={handleClearWarningHistory}
                disabled={isLoadingAction}
                className="text-xs font-bold text-foreground-40 hover:text-foreground transition-colors cursor-pointer"
              >
                {t("admin.clear_warning_history")}
              </button>
            )}
          </div>
          <div className="flex flex-col">
            {warnings.length === 0 && (
              <p className="text-center text-foreground-60 py-8 font-medium border-t border-surface-border">
                {t("admin.no_warning_history")}
              </p>
            )}
            {warnings.map((warning: ApiAdminWarning) => (
              <div
                key={warning.id}
                className="flex items-center justify-between px-4 py-3 bg-surface border border-surface-border rounded-2xl mt-3 cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                    <VolumeX className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {t("admin.warned_by")}:{" "}
                      {warning.admin?.username ? (
                        <Link
                          href={`/${locale}/u/${warning.admin.username}`}
                          className="hover:underline"
                        >
                          u/{warning.admin.username}
                        </Link>
                      ) : (
                        "System"
                      )}
                    </span>
                    <span className="text-xs text-foreground-60">
                      {formatDate(warning.createdAt, locale)}
                    </span>
                  </div>
                </div>
                <TooltipRoot delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDeleteWarning(warning.id)}
                      disabled={isLoadingAction}
                      className="p-2 rounded-full border-2 border-warning text-warning bg-warning/10 hover:bg-warning/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent
                      side="bottom"
                      sideOffset={6}
                      className="z-[9999] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                    >
                      {t("admin.remove_warning")}
                      <TooltipArrow className="fill-foreground" />
                    </TooltipContent>
                  </TooltipPortal>
                </TooltipRoot>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground-40 mb-4">
          {reports.length} {t("admin.reports")}
        </h3>

        <div className="flex flex-col">
          {reports.length === 0 && (
            <div className="text-center py-10 text-foreground-40 text-sm font-medium">
              {t("admin.no_user_reports")}
            </div>
          )}
          {reports.map((report: AdminReportItem) => {
            const usernameForDisplay = report.reporter?.username?.startsWith(
              "u/",
            )
              ? report.reporter.username.slice(2)
              : report.reporter?.username;
            const reportedBySplit = t("communityPage.reported_by")
              .replace("u/{{user}}", "{{user}}")
              .split("{{user}}");

            // Determine Report Type Badge
            const isUserReport = !!report.targetUserId;
            const isCommentReport = !isUserReport && !!report.targetCommentId;

            const badgeText = isUserReport
              ? t("admin.user_report")
              : isCommentReport
                ? t("admin.comment_report")
                : t("admin.post_report");

            return (
              <div
                key={report.id}
                className={cn(
                  "p-4 bg-surface border border-surface-border rounded-2xl mb-3 transition-colors",
                  report.isSuppressed && "opacity-60 bg-foreground/[0.02]",
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" /> {badgeText}
                      </span>
                      {report.isSuppressed && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-foreground/10 text-foreground-60 uppercase">
                          {t("admin.suppressed_badge")}
                        </span>
                      )}
                    </div>

                    {report.targetComment ? (
                      <div className="flex flex-col gap-2 w-full mt-1">
                        <span className="text-xs text-foreground-60">
                          {t("admin.report_context_comment")}{" "}
                          {t("admin.in_post")}{" "}
                          <Link
                            href={`/${locale}/${report.targetComment.post.community?.name ? `communities/${report.targetComment.post.community.name}` : `u/${targetUser.username}`}/${report.targetComment.post.id}/${report.targetComment.id}`}
                            className="text-foreground font-semibold hover:underline"
                          >
                            {report.targetComment.post.title}
                          </Link>{" "}
                          {report.targetComment.post.community ? (
                            <>
                              {t("admin.in_community")}{" "}
                              <Link
                                href={`/${locale}/communities/${report.targetComment.post.community.name}`}
                                className="text-foreground font-semibold hover:underline"
                              >
                                c/{report.targetComment.post.community.name}
                              </Link>
                            </>
                          ) : (
                            <>
                              {t("admin.on_profile")}{" "}
                              <Link
                                href={`/${locale}/u/${targetUser.username}`}
                                className="text-foreground font-semibold hover:underline"
                              >
                                u/{targetUser.username}
                              </Link>
                            </>
                          )}
                        </span>
                        <div className="flex gap-3 p-3 bg-background border border-surface-border/50 rounded-xl mt-1 w-full">
                          <Link
                            href={`/${locale}/u/${targetUser.username}`}
                            className="shrink-0 mt-0.5"
                          >
                            <Avatar className="h-8 w-8 border border-surface-border bg-background">
                              {targetUser.image && (
                                <AvatarImage src={targetUser.image} />
                              )}
                              {!targetUser.image && targetUser.avatarBgColor ? (
                                <IconAvatar
                                  emoji={targetUser.avatarEmoji}
                                  bgColor={targetUser.avatarBgColor}
                                  emojiSizeClass="text-xl"
                                />
                              ) : (
                                <AvatarFallback className="text-xs font-bold bg-surface text-foreground">
                                  {targetUser.username?.[0]?.toUpperCase() ||
                                    t("admin.avatar_fallback")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </Link>
                          <div className="flex flex-col min-w-0">
                            <Link
                              href={`/${locale}/u/${targetUser.username}`}
                              className="text-xs font-bold text-foreground hover:underline w-fit"
                            >
                              u/{targetUser.username}
                            </Link>
                            <span className="text-sm text-foreground-67 mt-0.5 line-clamp-3">
                              {report.targetComment.content}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : report.targetPost ? (
                      <span className="text-xs text-foreground-60">
                        {t("admin.report_context_post")}{" "}
                        <Link
                          href={`/${locale}/${report.targetPost.community?.name ? `communities/${report.targetPost.community.name}` : `u/${targetUser.username}`}/${report.targetPost.id}`}
                          className="text-foreground font-semibold hover:underline"
                        >
                          {report.targetPost.title}
                        </Link>{" "}
                        {report.targetPost.community ? (
                          <>
                            {t("admin.in_community")}{" "}
                            <Link
                              href={`/${locale}/communities/${report.targetPost.community.name}`}
                              className="text-foreground font-semibold hover:underline"
                            >
                              c/{report.targetPost.community.name}
                            </Link>
                          </>
                        ) : (
                          <>
                            {t("admin.on_profile")}{" "}
                            <Link
                              href={`/${locale}/u/${targetUser.username}`}
                              className="text-foreground font-semibold hover:underline"
                            >
                              u/{targetUser.username}
                            </Link>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-foreground-60">
                        {t("admin.report_context_profile")}{" "}
                        <Link
                          href={`/${locale}/u/${targetUser.username}`}
                          className="text-foreground font-semibold hover:underline"
                        >
                          u/{targetUser.username}
                        </Link>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground-40 hidden sm:block">
                      {formatDate(report.createdAt, locale)}
                    </span>
                    <DropdownMenu>
                      <Tooltip content={t("post.more")} side="bottom">
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-foreground/8 text-foreground-40 hover:text-foreground transition-colors cursor-pointer flex-shrink-0 focus:outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                      </Tooltip>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 overflow-hidden rounded-xl p-0"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleSuppress(report.id, report.isSuppressed)
                          }
                          className="py-3 px-4 rounded-none w-full text-foreground-60 font-medium hover:bg-foreground/5 cursor-pointer"
                        >
                          {report.isSuppressed ? (
                            <>
                              <Eye className="h-4 w-4 mr-2.5" />{" "}
                              {t("admin.unsuppress_report")}
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-2.5" />{" "}
                              {t("admin.suppress_report")}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-surface-border m-0" />
                        <DropdownMenuItem
                          onClick={() => handleDeleteReport(report.id)}
                          className="py-3 px-4 rounded-none w-full text-brand! font-medium hover:bg-foreground/5 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2.5 text-brand" />{" "}
                          {t("admin.remove_report")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-sm text-foreground-67 mb-3">
                  {report.reason}
                </p>
                <div className="text-xs text-foreground-40">
                  {reportedBySplit[0]}
                  {report.reporter?.username ? (
                    <>
                      {reportedBySplit[0]}
                      <Link
                        href={`/${locale}/u/${usernameForDisplay}`}
                        className="text-foreground font-semibold hover:underline"
                      >
                        u/{usernameForDisplay}
                      </Link>
                      {reportedBySplit[1]}
                    </>
                  ) : (
                    t("admin.unknown_user")
                  )}
                  {reportedBySplit[1]}
                </div>
                <span className="text-xs text-foreground-40 mt-1 sm:hidden block">
                  {formatDate(report.createdAt, locale)}
                </span>
              </div>
            );
          })}
        </div>

        <GlobalBanModal
          isOpen={isBanModalOpen}
          onClose={() => setIsBanModalOpen(false)}
          onConfirm={handleBanSubmit}
          username={username}
          onSuccessComplete={handleBanSuccess}
        />

        <ClearUserReportsModal
          isOpen={isClearReportsModalOpen}
          onClose={() => setIsClearReportsModalOpen(false)}
          onConfirm={handleClearReports}
          targetName={`u/${username}`}
          onSuccessComplete={handleClearReportsSuccess}
        />

        <GlobalMuteModal
          isOpen={isMuteModalOpen}
          onClose={() => {
            setIsMuteModalOpen(false);
            mutateMute(); // re-fetch only after modal has fully closed
          }}
          onConfirm={handleMuteSubmit}
          username={username}
          isCurrentlyMuted={!!activeMute}
          initialReason={activeMute?.reason}
          onLift={handleLiftMute}
        />

        <AdminWarnModal
          isOpen={isWarnModalOpen}
          onClose={() => setIsWarnModalOpen(false)}
          onConfirm={handleWarnSubmit}
          targetName={`u/${username}`}
          type="USER"
        />

        <MutedInfoModal
          isOpen={isMutedInfoModalOpen}
          onClose={() => setIsMutedInfoModalOpen(false)}
          reason={activeMute?.reason}
          mutedUntil={activeMute?.expiresAt}
        />
      </div>
    </div>
  );
}
