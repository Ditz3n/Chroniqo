// src/app/[locale]/(protected)/u/[username]/settings/(components)/settings-tabs.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { SettingsTab, UserProfile } from "@/types/app-types";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { AccountSettings } from "./account-settings";
import { HealthSettings } from "./health-settings";
import { PrivacySettings } from "./privacy-settings";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SettingsTabs({
  profile,
  onUpdate,
}: {
  profile: UserProfile;
  onUpdate: () => void;
}) {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("privacy");

  const tabs: { id: SettingsTab; labelKey: string }[] = [
    { id: "privacy", labelKey: "settings.tab_privacy" },
    { id: "account", labelKey: "settings.tab_account" },
    { id: "health", labelKey: "settings.tab_health" },
  ];

  // Preload all account tab data on /settings mount so Account tab renders instantly
  useSWR("/api/users/settings/security", fetcher, { revalidateOnFocus: false });
  useSWR("/api/user/username-change-request", fetcher, {
    revalidateOnFocus: false,
  });
  useSWR("/api/user/delete-request", fetcher, { revalidateOnFocus: false });

  return (
    <div className="flex flex-col w-full">
      {/* Tab Bar - back button + tabs */}
      <div className="flex items-center overflow-x-auto no-scrollbar border-b border-surface-border mb-6">
        <Link
          href={`/${locale}/u/${profile.username}`}
          className="flex items-center gap-1.5 px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 border-transparent text-foreground-60 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("settings.tab_back")}
        </Link>

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
              activeTab === tab.id
                ? "border-brand text-foreground"
                : "border-transparent text-foreground-60 hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      {activeTab === "privacy" && (
        <PrivacySettings profile={profile} onUpdate={onUpdate} />
      )}
      {activeTab === "account" && <AccountSettings profile={profile} />}
      {activeTab === "health" && (
        <HealthSettings profile={profile} onUpdate={onUpdate} />
      )}
    </div>
  );
}
