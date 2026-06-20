// src/app/[locale]/(protected)/communities/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CategoryTab, CommunitiesOverviewData } from "@/types/app-types";
import { Plus } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { CommunityCard } from "./(components)/community-card";
import { CreateCommunityModal } from "./(components)/create-community-modal";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch communities");
    return res.json();
  });

export default function CommunitiesPage() {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR<CommunitiesOverviewData>(
    "/api/communities",
    fetcher,
  );

  const suspendedCommunities = data?.suspended || [];

  const tabs: { id: CategoryTab; labelKey: string }[] = [
    { id: "all", labelKey: "communitiesPage.tab_all" },
    { id: "joined", labelKey: "communitiesPage.tab_joined" },
    { id: "chronic", labelKey: "communitiesPage.tab_chronic" },
    { id: "physical", labelKey: "communitiesPage.tab_physical" },
    { id: "psychological", labelKey: "communitiesPage.tab_psychological" },
    { id: "hidden", labelKey: "communitiesPage.tab_hidden" },
    { id: "blocked", labelKey: "communitiesPage.tab_blocked" },
  ];

  // Only show the Suspended tab if the user actually has access to any
  if (suspendedCommunities.length > 0) {
    tabs.push({ id: "suspended", labelKey: "communitiesPage.tab_suspended" });
  }

  // Filtering
  const recommended = data?.recommended || [];
  const allCommunities = data?.all || [];
  const joinedCommunities = data?.joined || [];
  const hiddenCommunities = data?.hidden || [];
  const blockedCommunities = data?.blocked || [];

  const filteredAll =
    activeTab === "all"
      ? allCommunities
      : activeTab === "joined"
        ? joinedCommunities
        : activeTab === "hidden"
          ? hiddenCommunities
          : activeTab === "blocked"
            ? blockedCommunities
            : activeTab === "suspended"
              ? suspendedCommunities
              : allCommunities.filter((c) => c.category === activeTab);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-64 w-full items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-10 pb-16">
        {/* Recommended Section (Only on 'All' tab) */}
        {activeTab === "all" && recommended.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand pl-1">
              {t("communitiesPage.recommended")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 min-[1080px]:grid-cols-3 gap-6">
              {recommended.map((community) => (
                <CommunityCard
                  key={`rec-${community.id}`}
                  community={community}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        )}

        {/* All / Filtered Section */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground-40 pl-1">
            {activeTab === "all"
              ? t("communitiesPage.all")
              : t(`communitiesPage.tab_${activeTab}`)}
          </h2>

          {filteredAll.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface border border-surface-border rounded-2xl text-foreground-40">
              <p className="text-sm font-medium">
                {t("communitiesPage.empty_state")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 min-[1080px]:grid-cols-3 gap-6">
              {filteredAll.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full min-h-full py-6 sm:py-8 justify-center">
      <div className="flex flex-col w-full max-w-[1100px] px-4 sm:px-6 mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold font-heading text-foreground">
            {t("communitiesPage.title")}
          </h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-full hover:opacity-90 transition-opacity w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            {t("communitiesPage.create_button")}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-surface-border mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 sm:px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 outline-none cursor-pointer",
                activeTab === tab.id
                  ? "border-brand text-foreground"
                  : "border-transparent text-foreground-60 hover:text-foreground",
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {renderContent()}

        {/* Create Modal */}
        <CreateCommunityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            mutate();
          }}
        />
      </div>
    </div>
  );
}
