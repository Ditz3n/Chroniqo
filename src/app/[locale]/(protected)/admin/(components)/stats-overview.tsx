// src/app/[locale]/(protected)/admin/(components)/stats-overview.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  AdminPlatformStats,
  AdminStatsRange,
  RangeOption,
  StatCardProps,
} from "@/types/app-types";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  MessageSquare,
  MicOff,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Index matches stored DailyStatus.value (0-4)
const MOOD_CSS_VARS = [
  "var(--color-dailystatus-exhausted)",
  "var(--color-dailystatus-low-energy)",
  "var(--color-dailystatus-neutral)",
  "var(--color-dailystatus-good-periods)",
  "var(--color-dailystatus-full-energy)",
];

const MOOD_I18N_KEYS = [
  "admin.mood_exhausted",
  "admin.mood_low_energy",
  "admin.mood_neutral",
  "admin.mood_good_periods",
  "admin.mood_full_energy",
];

const RANGE_OPTIONS: RangeOption[] = [
  { value: "today", labelKey: "admin.stats_range_today", icon: Clock },
  { value: "week", labelKey: "admin.stats_range_week", icon: CalendarDays },
  { value: "month", labelKey: "admin.stats_range_month", icon: CalendarRange },
  { value: "year", labelKey: "admin.stats_range_year", icon: Calendar },
];

// Mirrors FeedHeader's item style exactly
const itemCls =
  "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";
const activeItemCls =
  "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground font-medium bg-foreground/5 group/item hover:bg-foreground/5 focus:bg-foreground/5";

function computeTrend(current: number, previous: number) {
  if (previous === 0) return null;
  const delta = current - previous;
  if (delta === 0) return { dir: "flat" as const, pct: 0 };
  return {
    dir: delta > 0 ? ("up" as const) : ("down" as const),
    pct: Math.abs(Math.round((delta / previous) * 100)),
  };
}

function TrendBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const trend = computeTrend(current, previous);
  if (!trend) return null;

  if (trend.dir === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-foreground-40">
        → 0%
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-bold",
        trend.dir === "up"
          ? "text-[var(--color-dailystatus-full-energy)]"
          : "text-[var(--color-feedback-error)]",
      )}
    >
      {trend.dir === "up" ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {trend.pct}%
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  subLabel,
}: StatCardProps) {
  return (
    <div className="relative bg-surface border border-surface-border rounded-2xl p-5 flex flex-col items-center justify-center text-center overflow-hidden min-h-[128px]">
      {/* Unified brand accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand" />

      {/* Large faded icon as background watermark */}
      <Icon className="absolute h-16 w-16 text-foreground opacity-[0.05] pointer-events-none select-none" />

      {/* Content sits above the watermark */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="text-3xl font-bold font-heading text-foreground leading-none tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <span className="text-xs font-semibold text-foreground-60">
          {label}
        </span>
        {(trend || subLabel) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {trend}
            {subLabel && (
              <span className="text-[10px] text-foreground-40">{subLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-40 mb-3 mt-1">
      {label}
    </h3>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-surface-border rounded-2xl p-5 flex flex-col items-center justify-center min-h-[128px] animate-pulse gap-3">
      <div className="h-8 w-16 rounded-lg bg-foreground/[0.05]" />
      <div className="h-3 w-24 rounded bg-foreground/[0.05]" />
    </div>
  );
}

export function StatsOverview() {
  const { t } = useTranslation();
  const [range, setRange] = useState<AdminStatsRange>("week");
  const [hoveredMood, setHoveredMood] = useState<number | null>(null);

  const currentOption = RANGE_OPTIONS.find((o) => o.value === range)!;
  const RangeIcon = currentOption.icon;

  // SWR key includes range so the cache is scoped per selection
  const { data, isLoading } = useSWR<AdminPlatformStats>(
    `/api/admin/stats?range=${range}`,
    fetcher,
    { refreshInterval: 60_000 },
  );

  // Substitutes {{period}} in a translation key with the current range's label.
  // e.g. "New {{period}}" + "this week" → "New this week"
  const withPeriod = (key: string) =>
    t(key).replace("{{period}}", t(`admin.stats_range_${range}`));

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-9 w-36 rounded-xl bg-surface border border-surface-border animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const { users, content, communities, moderation, mood } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* Time range selector */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-surface-border bg-surface hover:bg-foreground/8 text-foreground-60 hover:text-foreground text-sm font-semibold transition-all cursor-pointer focus:outline-none data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground">
              <RangeIcon className="h-4 w-4" />
              <span>{t(currentOption.labelKey)}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-48 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0"
          >
            <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
              {t("admin.stats_time_period")}
            </DropdownMenuLabel>
            {RANGE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = range === opt.value;
              return (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={cn(isActive ? activeItemCls : itemCls)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 mr-2.5 transition-transform duration-200 group-hover/item:scale-110",
                      isActive ? "text-brand" : "text-foreground-60",
                    )}
                  />
                  <span className={isActive ? "text-foreground" : ""}>
                    {t(opt.labelKey)}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Users */}
      <section>
        <SectionHeading label={t("admin.stats_users_section")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label={t("admin.stats_total_users")}
            value={users.total}
          />
          <StatCard
            icon={Users}
            label={withPeriod("admin.stats_new_users_period")}
            value={users.newThisPeriod}
            trend={
              <TrendBadge
                current={users.newThisPeriod}
                previous={users.newLastPeriod}
              />
            }
            subLabel={t(`admin.stats_vs_${range}`)}
          />
          <StatCard
            icon={Users}
            label={t("admin.stats_onboarded_users")}
            value={users.onboarded}
            subLabel={`${users.onboardingRate}% ${t("admin.stats_onboarding_rate")}`}
          />
        </div>
      </section>

      {/* Content */}
      <section>
        <SectionHeading label={t("admin.stats_content_section")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            icon={FileText}
            label={t("admin.stats_total_posts")}
            value={content.totalPosts}
          />
          <StatCard
            icon={FileText}
            label={withPeriod("admin.stats_posts_period")}
            value={content.postsThisPeriod}
            trend={
              <TrendBadge
                current={content.postsThisPeriod}
                previous={content.postsLastPeriod}
              />
            }
            subLabel={t(`admin.stats_vs_${range}`)}
          />
          <StatCard
            icon={MessageSquare}
            label={t("admin.stats_total_comments")}
            value={content.totalComments}
          />
          <StatCard
            icon={MessageSquare}
            label={withPeriod("admin.stats_comments_period")}
            value={content.commentsThisPeriod}
            trend={
              <TrendBadge
                current={content.commentsThisPeriod}
                previous={content.commentsLastPeriod}
              />
            }
            subLabel={t(`admin.stats_vs_${range}`)}
          />
        </div>
      </section>

      {/* Communities */}
      <section>
        <SectionHeading label={t("admin.stats_communities_section")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Globe}
            label={t("admin.stats_active_communities")}
            value={communities.active}
          />
          <StatCard
            icon={Globe}
            label={t("admin.stats_suspended_communities")}
            value={communities.suspended}
            subLabel={
              communities.total > 0
                ? `${Math.round((communities.suspended / communities.total) * 100)}% ${t("admin.stats_of_total")}`
                : undefined
            }
          />
          <StatCard
            icon={Globe}
            label={withPeriod("admin.stats_new_communities_period")}
            value={communities.newThisPeriod}
          />
        </div>
      </section>

      {/* Moderation */}
      <section>
        <SectionHeading label={t("admin.stats_moderation_section")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Ban}
            label={t("admin.stats_active_bans")}
            value={moderation.activeBans}
          />
          <StatCard
            icon={MicOff}
            label={t("admin.stats_active_mutes")}
            value={moderation.activeMutes}
          />
          <StatCard
            icon={AlertTriangle}
            label={t("admin.stats_pending_reports")}
            value={moderation.pendingReports}
            subLabel={`${moderation.totalReports} ${t("admin.stats_total_reports")}`}
          />
        </div>
      </section>

      {/* Mood Distribution*/}
      <section>
        <div className="flex items-center justify-between mb-3 mt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-40">
            {withPeriod("admin.stats_mood_section")}
          </h3>
          <span className="text-[10px] font-medium text-foreground-40">
            {mood.total.toLocaleString()}{" "}
            {withPeriod("admin.stats_mood_entries")}
          </span>
        </div>

        {mood.total === 0 ? (
          <div className="flex items-center justify-center py-10 bg-surface border border-surface-border rounded-2xl text-sm text-foreground-40 font-medium">
            {t("admin.stats_no_mood_data")}
          </div>
        ) : (
          <div className="bg-surface border border-surface-border rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex w-full h-6 rounded-xl overflow-hidden gap-0.5">
              {mood.distribution.map((entry) => {
                if (entry.percentage === 0) return null;
                const isHovered = hoveredMood === entry.value;
                const isDimmed = hoveredMood !== null && !isHovered;
                return (
                  <Tooltip
                    key={entry.value}
                    content={`${t(MOOD_I18N_KEYS[entry.value])} - ${entry.percentage}% (${entry.count.toLocaleString()})`}
                    side="top"
                  >
                    <div
                      className="h-full transition-all duration-200 first:rounded-l-xl last:rounded-r-xl cursor-default"
                      style={{
                        width: `${entry.percentage}%`,
                        backgroundColor: MOOD_CSS_VARS[entry.value],
                        filter: isHovered
                          ? "brightness(1.25)"
                          : isDimmed
                            ? "brightness(0.55)"
                            : "brightness(1)",
                        opacity: isDimmed ? 0.75 : 1,
                      }}
                      onMouseEnter={() => setHoveredMood(entry.value)}
                      onMouseLeave={() => setHoveredMood(null)}
                    />
                  </Tooltip>
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {mood.distribution.map((entry) => (
                <div key={entry.value} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: MOOD_CSS_VARS[entry.value],
                      filter:
                        hoveredMood === entry.value
                          ? "brightness(1.25)"
                          : hoveredMood !== null
                            ? "brightness(0.55)"
                            : "brightness(1)",
                      opacity:
                        hoveredMood !== null && hoveredMood !== entry.value
                          ? 0.75
                          : 1,
                    }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-foreground-60 truncate">
                      {t(MOOD_I18N_KEYS[entry.value])}
                    </span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {entry.percentage}%{" "}
                      <span className="text-foreground-40 font-medium">
                        ({entry.count.toLocaleString()})
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
