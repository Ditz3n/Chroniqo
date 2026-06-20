// src/app/[locale]/(protected)/communities/[name]/members/page.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { ApiCommunityDetail } from "@/types/app-types";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";
import { CommunityHeader } from "../(components)/community-header";
import { CommunitySidebar } from "../(components)/community-sidebar";
import { MembersTabs } from "./(components)/members-tabs";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export default function CommunityMembersPage() {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const name = params.name as string;

  // Fetch the community first to get the sidebar data and verify baseline access
  const { data, error, isLoading, mutate } = useSWR<{
    community: ApiCommunityDetail;
  }>(name ? `/api/communities/${encodeURIComponent(name)}` : null, fetcher);

  const community = data?.community;

  useEffect(() => {
    // If loaded and user has no access, boot them back to the community page
    if (community && session?.user) {
      const isGlobalAdmin = session.user.role === "ADMIN";
      const role = community.membership.role;
      const hasAccess =
        isGlobalAdmin || ["OWNER", "ADMIN", "MODERATOR"].includes(role || "");

      if (!hasAccess) {
        router.replace(`/${locale}/communities/${encodeURIComponent(name)}`);
      }
    }
  }, [community, session, router, locale, name]);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 text-foreground-60">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {t("communityPage.not_found_title")}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-full justify-center pb-12 pt-6">
      <div className="flex flex-col w-full max-w-[1100px] px-4 sm:px-6 mx-auto">
        <CommunityHeader
          community={community}
          isPersonallyHidden={community.isPersonallyHidden}
          onUpdate={mutate}
        />

        <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1fr_312px] gap-8 w-full mt-2">
          <div className="flex flex-col min-w-0 w-full">
            <MembersTabs
              communityName={community.name}
              currentUserId={session?.user?.id || ""}
              isGlobalAdmin={session?.user?.role === "ADMIN"}
            />
          </div>
          <div className="hidden min-[1080px]:block">
            <CommunitySidebar community={community} onUpdate={mutate} />
          </div>
        </div>
      </div>
    </div>
  );
}
