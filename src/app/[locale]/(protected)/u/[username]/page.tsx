// src/app/[locale]/(protected)/u/[username]/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { UserProfile } from "@/types/app-types";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProfileHeader } from "./(components)/profile-header";
import { ProfileSidebar } from "./(components)/profile-sidebar";
import { ProfileTabs } from "./(components)/profile-tabs";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export default function ProfilePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const params = useParams();
  const username = params.username as string;

  const { data, error, isLoading, mutate } = useSWR(
    username ? `/api/users/${username}` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-foreground-60">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {t("profile.user_not_found", { username })}
        </h1>
        <p>{t("profile.user_not_found_desc")}</p>
      </div>
    );
  }

  const profile: UserProfile = data.profile;
  const isOwnProfile = session?.user?.id === profile.id;

  return (
    <div className="expanded-layout flex w-full min-h-full justify-center pb-12">
      <div className="flex flex-col w-full max-w-[1100px] px-0 sm:px-6">
        {/* Full width header */}
        <div className="w-full mb-4 px-4 sm:px-0">
          <ProfileHeader
            profile={profile}
            isOwnProfile={isOwnProfile}
            onUpdate={() => mutate()}
          />
        </div>

        {/* Dual column layout */}
        <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1fr_312px] gap-8 w-full">
          {/* Left Column: Tabs & Feed */}
          <div className="flex flex-col min-w-0 w-full px-4 sm:px-0 order-2 min-[1080px]:order-1">
            <ProfileTabs profile={profile} isOwnProfile={isOwnProfile} />
          </div>

          {/* Right Column: Sidebar (Sticky) */}
          <div className="order-1 min-[1080px]:order-2 px-4 sm:px-0">
            <ProfileSidebar
              profile={profile}
              isOwnProfile={isOwnProfile}
              onUpdate={() => mutate()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
