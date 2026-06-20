// src/app/[locale]/(protected)/feed/(components)/feed-header.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { PostLayout, SortOption } from "@/types/app-types";
import {
  ChevronDown,
  Flame,
  LayoutList,
  Rows3,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

interface FeedHeaderProps {
  layout: PostLayout;
  sort: SortOption;
  onLayoutChange: (l: PostLayout) => void;
  onSortChange: (s: SortOption) => void;
}

const SORT_OPTIONS: {
  value: SortOption;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  { value: "best", labelKey: "feed.sort_best", icon: Sparkles },
  { value: "hot", labelKey: "feed.sort_hot", icon: Flame },
  { value: "new", labelKey: "feed.sort_new", icon: Zap },
  { value: "top", labelKey: "feed.sort_top", icon: Star },
  { value: "rising", labelKey: "feed.sort_rising", icon: TrendingUp },
];

const LAYOUT_OPTIONS: {
  value: PostLayout;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  { value: "card", labelKey: "feed.view_card", icon: Rows3 },
  { value: "compact", labelKey: "feed.view_compact", icon: LayoutList },
];

const itemCls =
  "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground-60 font-medium group/item hover:bg-foreground/5 focus:bg-foreground/5";
const activeItemCls =
  "py-2.5 px-4 cursor-pointer rounded-none w-full text-foreground font-medium bg-foreground/5 group/item hover:bg-foreground/5 focus:bg-foreground/5";

export function FeedHeader({
  layout,
  sort,
  onLayoutChange,
  onSortChange,
}: FeedHeaderProps) {
  const { t } = useTranslation();

  const currentSort = SORT_OPTIONS.find((s) => s.value === sort)!;
  const currentLayout = LAYOUT_OPTIONS.find((l) => l.value === layout)!;

  const SortIcon = currentSort.icon;
  const LayoutIcon = currentLayout.icon;

  return (
    <div className="flex items-center justify-start gap-2 mb-4">
      {/* Sort dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-surface-border bg-surface hover:bg-foreground/8 text-foreground-60 hover:text-foreground text-sm font-semibold transition-all cursor-pointer focus:outline-none data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground">
            <SortIcon className="h-4 w-4" />
            <span>{t(currentSort.labelKey)}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0"
        >
          <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
            {t("feed.sort_by")}
          </DropdownMenuLabel>
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = sort === opt.value;
            return (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onSortChange(opt.value)}
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

      {/* View / layout dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-surface-border bg-surface hover:bg-foreground/8 text-foreground-60 hover:text-foreground text-sm font-semibold transition-all cursor-pointer focus:outline-none data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground">
            <LayoutIcon className="h-4 w-4" />
            <span>{t(currentLayout.labelKey)}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-xl border-surface-border bg-background shadow-xl overflow-hidden p-0"
        >
          <DropdownMenuLabel className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground-40 border-b border-surface-border">
            {t("feed.view")}
          </DropdownMenuLabel>
          {LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = layout === opt.value;
            return (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onLayoutChange(opt.value)}
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
  );
}
