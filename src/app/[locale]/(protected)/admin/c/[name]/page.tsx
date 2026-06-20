// src/app/[locale]/(protected)/admin/c/[name]/page.tsx
"use client";

import { AdminWarnModal } from "@/components/moderation/admin-warn-modal";
import { ClearCommunityReportsModal } from "@/components/moderation/clear-community-reports-modal";
import { DeleteCommunityModal } from "@/components/moderation/delete-community-modal";
import { SuspendCommunityModal } from "@/components/moderation/suspend-community-modal";
import { SuspendedInfoModal } from "@/components/moderation/suspended-info-modal";
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
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format-date";
import { formatMuteTimeLeft } from "@/lib/utils/format-mute-time-left";
import { AdminReportItem, ApiAdminWarning } from "@/types/app-types";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MoreHorizontal,
  ShieldAlert,
  Trash2,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminCommunityReportsPage() {
  const { t, locale } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const name = params.name as string;

  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isClearReportsModalOpen, setIsClearReportsModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
  const [isSuspendedInfoModalOpen, setIsSuspendedInfoModalOpen] =
    useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data, isLoading, mutate } = useSWR(
    name ? `/api/admin/reports/communities/${encodeURIComponent(name)}` : null,
    fetcher,
  );

  const { targetCommunity, reports = [], warnings = [] } = data || {};
  const isSuspended = targetCommunity?.isActive === false;
  const hasTimedSuspension = isSuspended && !!targetCommunity?.bannedUntil;
  const activeReports = reports.filter(
    (r: AdminReportItem) => !r.isSuppressed,
  ).length;

  useEffect(() => {
    if (!hasTimedSuspension) return;

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [hasTimedSuspension]);

  const handleClearReports = async () => {
    setIsLoadingAction(true);
    try {
      await fetch(
        `/api/admin/reports/communities/${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleClearReportsSuccess = () => {
    router.push(`/${locale}/admin`);
  };

  const handleSuspendSubmit = async (
    action: "suspend" | "lift",
    reason: string,
    durationHours: string,
  ) => {
    const hours = Number(durationHours);
    await fetch(`/api/admin/communities/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, durationHours: hours, action }),
    });
    mutate();
  };

  const handleDeleteSubmit = async (reason: string) => {
    await fetch(
      `/api/admin/communities/${encodeURIComponent(name)}?action=deleteCommunity`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
  };

  const handleDeleteSuccess = () => {
    router.push(`/${locale}/admin`);
  };

  const handleWarnSubmit = async () => {
    await fetch(`/api/admin/communities/${encodeURIComponent(name)}/warn`, {
      method: "POST",
    });
    mutate();
  };

  const handleClearWarningHistory = async () => {
    setIsLoadingAction(true);
    try {
      await fetch(
        `/api/admin/communities/${encodeURIComponent(name)}/warnings`,
        { method: "DELETE" },
      );
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

        {targetCommunity && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface border border-surface-border rounded-2xl mb-8">
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/communities/${targetCommunity.name}`}
                className="cursor-pointer"
                tabIndex={0}
                aria-label={`Go to community c/${targetCommunity.name}`}
              >
                <Avatar className="h-16 w-16 rounded-xl border border-surface-border bg-background overflow-hidden">
                  {targetCommunity.image && (
                    <AvatarImage src={targetCommunity.image} />
                  )}
                  {!targetCommunity.image && targetCommunity.avatarBgColor ? (
                    <IconAvatar
                      emoji={targetCommunity.avatarEmoji}
                      bgColor={targetCommunity.avatarBgColor}
                      emojiSizeClass="text-3xl"
                    />
                  ) : (
                    <AvatarFallback className="bg-background rounded-xl">
                      <Users className="h-6 w-6 text-foreground-40" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/${locale}/communities/${targetCommunity.name}`}
                    className="w-fit cursor-pointer group"
                    tabIndex={0}
                    aria-label={`Go to community c/${targetCommunity.name}`}
                  >
                    <h2 className="text-xl font-bold text-foreground group-hover:underline">
                      c/{targetCommunity.name}
                    </h2>
                  </Link>
                  {isSuspended && (
                    <button
                      onClick={() => setIsSuspendedInfoModalOpen(true)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning uppercase hover:bg-warning/30 transition-colors cursor-pointer"
                    >
                      {t("communityPage.suspended_badge")}
                    </button>
                  )}
                </div>
                <span className="text-sm text-foreground-60">
                  {targetCommunity.isPrivate
                    ? t("communityPage.private")
                    : t("communityPage.public")}
                </span>
                <span className="text-xs font-semibold text-warning mt-1">
                  {activeReports} {t("admin.active_reports")}
                </span>
                {isSuspended && (
                  <span className="text-xs font-bold bg-warning/20 text-warning px-2.5 py-1 rounded-full mt-1 w-fit">
                    {targetCommunity?.bannedUntil
                      ? t("admin.suspended_time_left").replace(
                          "{{time}}",
                          formatMuteTimeLeft(
                            targetCommunity.bannedUntil,
                            nowMs,
                          ),
                        )
                      : t("admin.suspended_permanently_label")}
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
                <VolumeX className="h-4 w-4" /> {t("admin.warn_community")}
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => setIsSuspendModalOpen(true)}
                disabled={isLoadingAction}
                className="gap-2"
              >
                {isSuspended ? (
                  <>
                    <Eye className="h-4 w-4" /> {t("admin.update_suspension")}
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />{" "}
                    {t("admin.suspend_community")}
                  </>
                )}
              </Button>
              <Button
                variant="outline-brand"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isLoadingAction}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" /> {t("admin.delete_community")}
              </Button>
            </div>
          </div>
        )}

        {/* Warning History */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
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
                <Tooltip content={t("admin.remove_warning")} side="bottom">
                  <button
                    onClick={() => handleDeleteWarning(warning.id)}
                    disabled={isLoadingAction}
                    className="p-2 rounded-full border-2 border-warning text-warning bg-warning/10 hover:bg-warning/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground-40 mb-4">
          {reports.length} {t("admin.reports")}
        </h3>

        <div className="flex flex-col">
          {reports.length === 0 && (
            <p className="text-center text-foreground-60 py-10 font-medium">
              {t("admin.no_community_reports")}
            </p>
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

            return (
              <div
                key={report.id}
                className={cn(
                  "p-4 bg-surface border border-surface-border rounded-2xl mb-3 transition-colors",
                  report.isSuppressed && "opacity-60 bg-foreground/[0.02]",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />{" "}
                      {t("admin.community_report")}
                    </span>
                    {report.isSuppressed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-foreground/10 text-foreground-60 uppercase">
                        {t("admin.suppressed_badge")}
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

        <SuspendCommunityModal
          isOpen={isSuspendModalOpen}
          onClose={() => setIsSuspendModalOpen(false)}
          onConfirm={handleSuspendSubmit}
          isCurrentlySuspended={isSuspended}
          initialReason={targetCommunity?.banReason || undefined}
          targetName={`c/${name}`}
        />

        <ClearCommunityReportsModal
          isOpen={isClearReportsModalOpen}
          onClose={() => setIsClearReportsModalOpen(false)}
          onConfirm={handleClearReports}
          targetName={`c/${name}`}
          onSuccessComplete={handleClearReportsSuccess}
        />

        <DeleteCommunityModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteSubmit}
          targetName={`c/${name}`}
          onSuccessComplete={handleDeleteSuccess}
        />

        <AdminWarnModal
          key={String(isWarnModalOpen)}
          isOpen={isWarnModalOpen}
          onClose={() => setIsWarnModalOpen(false)}
          onConfirm={handleWarnSubmit}
          targetName={`c/${name}`}
          type="COMMUNITY"
        />

        <SuspendedInfoModal
          isOpen={isSuspendedInfoModalOpen}
          onClose={() => setIsSuspendedInfoModalOpen(false)}
          reason={targetCommunity?.banReason}
          bannedUntil={targetCommunity?.bannedUntil}
        />
      </div>
    </div>
  );
}
