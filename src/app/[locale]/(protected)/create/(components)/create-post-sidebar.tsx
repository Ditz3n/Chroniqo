// src/app/[locale]/(protected)/create/(components)/create-post-sidebar.tsx
"use client";

import { RuleItem } from "@/components/ui/rule-item";
import { useTranslation } from "@/lib/hooks/use-translation";
import { CreatePostSidebarProps } from "@/types/app-types";
import { ShieldAlert } from "lucide-react";

export function CreatePostSidebar({ destination }: CreatePostSidebarProps) {
  const { t } = useTranslation();

  // If a community has rules defined, use them. Otherwise, fallback to the platform default rules.
  const destRules = Array.isArray(destination.rules) ? destination.rules : [];
  const isCommunityWithRules =
    destination.type === "community" && destRules && destRules.length > 0;

  const rulesList = isCommunityWithRules
    ? destRules
    : t("createPost.rules_profile").split("\n");

  return (
    <div className="hidden min-[1080px]:flex w-[312px] flex-shrink-0 flex-col gap-6 sticky top-[76px]">
      <div className="rounded-2xl border border-surface-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-surface-border/50 pb-3">
          <ShieldAlert className="h-5 w-5 text-brand" />
          <h2 className="text-sm font-bold text-foreground">
            {t("createPost.rules_title")}
            {destination.type === "community" && ` c/${destination.name}`}
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {rulesList.map((rule: string, idx: number) => (
            <RuleItem key={idx} rule={rule} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
