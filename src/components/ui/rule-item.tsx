"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { useState } from "react";

type RuleItemProps = {
  rule: string;
  idx: number;
};

export function RuleItem({ rule, idx }: RuleItemProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongRule = rule.length > 100 || rule.split("\n").length > 3;

  return (
    <div className="flex flex-col gap-1 border-b border-surface-border/50 pb-3 last:border-0 last:pb-0 min-w-0">
      <div className="flex items-start gap-2 w-full min-w-0">
        <span className="text-sm font-bold text-foreground-60 shrink-0 mt-0.5">
          {idx + 1}.
        </span>
        <div className="flex flex-col min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium text-foreground-60 break-words whitespace-pre-wrap [overflow-wrap:anywhere]",
              !isExpanded && isLongRule && "line-clamp-3",
            )}
          >
            {rule}
          </p>
          {isLongRule && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-brand text-left w-fit mt-1 hover:underline cursor-pointer"
            >
              {isExpanded ? t("profile.show_less") : t("profile.show_more")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
