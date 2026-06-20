// src/app/[locale]/(protected)/search/(components)/search-results-view.tsx
"use client";

import {
  DISPLAY_QUERY_MAX,
  OVERVIEW_COMMUNITIES,
  OVERVIEW_POSTS,
  OVERVIEW_USERS,
} from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import {
  SearchCommunityResult,
  SearchResultsViewProps,
  SearchUserResult,
} from "@/types/app-types";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchResults } from "../(hooks)/use-search-results";
import { CommunityResultCard } from "./community-result-card";
import { SearchPostList } from "./search-post-list";
import { SectionHeading } from "./section-heading";
import { UserResultCard } from "./user-result-card";

// Mirrors the navbar logo: "Chroni" + brand-q + "o"
function ChroniqoBrandName() {
  return (
    <span className="font-heading font-extrabold tracking-tight normal-case">
      <span className="text-foreground">Chroni</span>
      <span className="text-brand">q</span>
      <span className="text-foreground">o</span>
    </span>
  );
}

export function SearchResultsView({
  query,
  type,
  scope,
  section,
  locale,
}: SearchResultsViewProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const isScoped = type === "community" || type === "user";
  const isSection = type === "global" && !!section;

  const { users, communities, posts, isLoading, handleHidePost } =
    useSearchResults({ query, type, scope, section });

  const displayQuery =
    query.length > DISPLAY_QUERY_MAX
      ? query.slice(0, DISPLAY_QUERY_MAX) + "…"
      : query;

  const buildShowMoreUrl = (sec: "users" | "communities" | "posts") =>
    `/${locale}/search?q=${encodeURIComponent(query)}&type=global&section=${sec}`;

  // Renders the context label with ChroniqoBrandName inline where applicable
  const renderContextLabel = () => {
    if (isSection) {
      const prefix =
        section === "users"
          ? t("search.section_prefix_users")
          : section === "communities"
            ? t("search.section_prefix_communities")
            : t("search.section_prefix_posts");
      return (
        <span className="text-foreground-60">
          {prefix} <ChroniqoBrandName />
        </span>
      );
    }
    if (type === "global") {
      return (
        <span className="text-foreground-60">
          {t("search.searching_in")} <ChroniqoBrandName />
        </span>
      );
    }
    if (type === "community") {
      return (
        <span className="text-brand">
          {t("search.scoped_community").replace("{{scope}}", scope ?? "")}
        </span>
      );
    }
    return (
      <span className="text-brand">
        {t("search.scoped_user").replace("{{scope}}", scope ?? "")}
      </span>
    );
  };

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-foreground-40">
        <p className="text-sm font-medium">{t("search.no_results")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="flex flex-col gap-1.5">
        {/* Back button - shown for scoped searches and single-section views */}
        {(isScoped && scope) || isSection ? (
          <button
            onClick={() =>
              router.push(
                isSection
                  ? `/${locale}/search?q=${encodeURIComponent(query)}&type=global`
                  : `/${locale}/search?q=${encodeURIComponent(query)}&type=global`,
              )
            }
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors w-fit cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            {isSection ? t("search.back_all_results") : t("search.back_global")}
          </button>
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-wider">
          {renderContextLabel()}
        </p>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground break-words -mt-4">
        {t("search.results_for").replace("{{query}}", displayQuery)}
      </h1>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Users */}
          {type === "global" && (!section || section === "users") && (
            <section className="flex flex-col gap-3">
              <SectionHeading>{t("search.users_label")}</SectionHeading>
              {users.length === 0 ? (
                <p
                  className={cn(
                    "text-sm text-foreground-40 font-medium py-4 text-center",
                    "bg-surface border border-surface-border rounded-2xl",
                  )}
                >
                  {t("search.empty_users")}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(isSection ? users : users.slice(0, OVERVIEW_USERS)).map(
                      (u: SearchUserResult) => (
                        <UserResultCard
                          key={u.id}
                          user={u}
                          locale={locale}
                          friendsLabel={t("search.stat_friends")}
                          supportsLabel={t("search.stat_supports")}
                        />
                      ),
                    )}
                  </div>
                  {!isSection && (
                    <button
                      onClick={() => router.push(buildShowMoreUrl("users"))}
                      className="flex items-center gap-1 self-start text-sm font-semibold text-brand hover:opacity-70 transition-opacity cursor-pointer mt-1"
                    >
                      {t("search.show_more_users")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {/* Communities */}
          {type === "global" && (!section || section === "communities") && (
            <section className="flex flex-col gap-3">
              <SectionHeading>{t("search.communities_label")}</SectionHeading>
              {communities.length === 0 ? (
                <p
                  className={cn(
                    "text-sm text-foreground-40 font-medium py-4 text-center",
                    "bg-surface border border-surface-border rounded-2xl",
                  )}
                >
                  {t("search.empty_communities")}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(isSection
                      ? communities
                      : communities.slice(0, OVERVIEW_COMMUNITIES)
                    ).map((c: SearchCommunityResult) => (
                      <CommunityResultCard
                        key={c.id}
                        community={c}
                        locale={locale}
                        membersLabel={t("communitiesPage.members")}
                      />
                    ))}
                  </div>
                  {!isSection && (
                    <button
                      onClick={() =>
                        router.push(buildShowMoreUrl("communities"))
                      }
                      className="flex items-center gap-1 self-start text-sm font-semibold text-brand hover:opacity-70 transition-opacity cursor-pointer mt-1"
                    >
                      {t("search.show_more_communities")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {/* Posts */}
          {(!section || section === "posts") && (
            <section className="flex flex-col gap-3">
              <SectionHeading>{t("search.section_posts")}</SectionHeading>
              {posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface border border-surface-border rounded-2xl text-foreground-40">
                  <p className="text-sm font-medium">
                    {t("search.empty_posts").replace("{{query}}", displayQuery)}
                  </p>
                </div>
              ) : (
                <>
                  <SearchPostList
                    posts={
                      isSection || isScoped
                        ? posts
                        : posts.slice(0, OVERVIEW_POSTS)
                    }
                    locale={locale}
                    onHidePost={handleHidePost}
                    query={displayQuery}
                  />
                  {/* Show more posts - only in global overview, not section or scoped view */}
                  {type === "global" && !isSection && (
                    <button
                      onClick={() => router.push(buildShowMoreUrl("posts"))}
                      className="flex items-center gap-1 self-start text-sm font-semibold text-brand hover:opacity-70 transition-opacity cursor-pointer mt-1"
                    >
                      {t("search.show_more_posts")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
