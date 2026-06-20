// src/app/[locale]/(protected)/(components)/search-bar.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cacheKeys } from "@/lib/cache-keys";
import { POPOVER_CLOSE_DURATION_MS } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import {
  addRecentQuery,
  addRecentSearch,
  clearRecentQueries,
  clearRecentSearches,
  getRecentQueries,
  getRecentSearches,
} from "@/lib/utils/search-storage";
import {
  RecentSearch,
  SearchBarProps,
  SearchCommunityResult,
  SearchSuggestResponse,
  SearchUserResult,
} from "@/types/app-types";
import { Clock, Search, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Search failed");
    return r.json();
  });

export function SearchBar({ onFocusChange }: SearchBarProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Context detection - mirrors the segment parsing in sidebar.tsx
  const segments = pathname
    .replace(`/${locale}`, "")
    .split("/")
    .filter(Boolean);
  const isCommunityDetailPage =
    segments[0] === "communities" && segments.length >= 2;
  const isUserProfilePage = segments[0] === "u" && segments.length >= 2;
  const isScoped = isCommunityDetailPage || isUserProfilePage;
  const communityScope = isCommunityDetailPage ? segments[1] : null;
  const userScope = isUserProfilePage ? segments[1] : null;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const shouldFetch = !isScoped && debouncedQuery.trim().length >= 1;
  const { data: suggestions, isLoading: isFetchingResults } =
    useSWR<SearchSuggestResponse>(
      shouldFetch ? cacheKeys.search.suggest(debouncedQuery.trim()) : null,
      fetcher,
    );

  const showGlobalRecents =
    !isScoped && query.trim().length === 0 && recentSearches.length > 0;
  const showScopedRecents =
    isScoped && query.trim().length === 0 && recentQueries.length > 0;
  const showSuggestions = !isScoped && query.trim().length >= 1;
  const hasCommunities = (suggestions?.communities?.length ?? 0) > 0;
  const hasUsers = (suggestions?.users?.length ?? 0) > 0;
  const hasNoResults =
    showSuggestions && !isFetchingResults && !hasCommunities && !hasUsers;

  const closePopover = useCallback(
    (immediate = false) => {
      if (immediate) {
        setIsOpen(false);
        onFocusChange(false);
        return;
      }
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        onFocusChange(false);
      }, 150);
    },
    [onFocusChange],
  );

  const navigateTo = useCallback(
    (href: string) => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setIsOpen(false);
      setQuery("");
      onFocusChange(false);
      inputRef.current?.blur();
      router.push(href);
    },
    [router, onFocusChange],
  );

  const handleSelectUser = (user: SearchUserResult) => {
    addRecentSearch({
      id: user.username ?? user.id,
      kind: "user",
      name: user.name,
      username: user.username,
      image: user.image,
      avatarEmoji: user.avatarEmoji,
      avatarBgColor: user.avatarBgColor,
    });
    navigateTo(`/${locale}/u/${user.username}`);
  };

  const handleSelectCommunity = (community: SearchCommunityResult) => {
    addRecentSearch({
      id: community.name,
      kind: "community",
      name: community.name,
      username: null,
      image: community.image,
      avatarEmoji: community.avatarEmoji,
      avatarBgColor: community.avatarBgColor,
      memberCount: community._count.members,
    });
    navigateTo(`/${locale}/communities/${community.name}`);
  };

  const handleSelectRecent = (item: RecentSearch) => {
    addRecentSearch(item);
    const href =
      item.kind === "user"
        ? `/${locale}/u/${item.username}`
        : `/${locale}/communities/${item.id}`;
    navigateTo(href);
  };

  const handleSelectRecentQuery = (q: string) => {
    addRecentQuery(q);
    const scope = communityScope ?? userScope;
    const type = isCommunityDetailPage ? "community" : "user";
    navigateTo(
      `/${locale}/search?q=${encodeURIComponent(q)}&type=${type}&scope=${encodeURIComponent(scope ?? "")}`,
    );
  };

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    // Close first so Radix animates out with content still visible,
    // then clear state after the animation completes
    setIsOpen(false);
    setTimeout(() => setRecentSearches([]), POPOVER_CLOSE_DURATION_MS);
  };

  const handleClearQueries = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentQueries();
    setIsOpen(false);
    setTimeout(() => setRecentQueries([]), POPOVER_CLOSE_DURATION_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closePopover(true);
      inputRef.current?.blur();
      return;
    }
    if (e.key !== "Enter" || !query.trim()) return;

    const q = query.trim();
    let href: string;

    if (isCommunityDetailPage && communityScope) {
      addRecentQuery(q);
      href = `/${locale}/search?q=${encodeURIComponent(q)}&type=community&scope=${encodeURIComponent(communityScope)}`;
    } else if (isUserProfilePage && userScope) {
      addRecentQuery(q);
      href = `/${locale}/search?q=${encodeURIComponent(q)}&type=user&scope=${encodeURIComponent(userScope)}`;
    } else {
      href = `/${locale}/search?q=${encodeURIComponent(q)}&type=global`;
    }

    setQuery("");
    closePopover(true);
    inputRef.current?.blur();
    router.push(href);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full min-w-[120px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-40 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={t("topNavbar.search_placeholder")}
            className="h-10 w-full rounded-full border border-surface-border bg-surface pl-11 pr-4 text-sm font-medium outline-none placeholder:text-foreground-40 focus:bg-background focus:ring-2 focus:ring-brand transition-all text-foreground"
            onFocus={() => {
              if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
              if (isScoped) {
                const queries = getRecentQueries();
                setRecentQueries(queries);
                if (queries.length > 0) setIsOpen(true);
              } else {
                const fresh = getRecentSearches();
                setRecentSearches(fresh);
                if (query.trim().length >= 1 || fresh.length > 0)
                  setIsOpen(true);
              }
              onFocusChange(true);
            }}
            onBlur={() => closePopover()}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (isScoped) {
                setIsOpen(val.trim().length === 0 && recentQueries.length > 0);
              } else {
                setIsOpen(val.trim().length >= 1 || recentSearches.length > 0);
              }
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        className="p-0 max-h-[420px] overflow-y-auto"
      >
        {/* Global recents - user/community click history */}
        {showGlobalRecents && (
          <section>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                {t("search.recent_label")}
              </span>
              <button
                onClick={handleClearRecents}
                className="text-[10px] font-semibold text-brand hover:opacity-70 transition-opacity cursor-pointer"
              >
                {t("search.clear_all")}
              </button>
            </div>
            {recentSearches.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => handleSelectRecent(item)}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-foreground/5 transition-colors cursor-pointer text-left"
              >
                <Clock className="h-3.5 w-3.5 text-foreground-40 flex-shrink-0" />
                <Avatar className="h-8 w-8 flex-shrink-0 border border-surface-border">
                  {item.image && <AvatarImage src={item.image} />}
                  {!item.image && item.avatarBgColor ? (
                    <IconAvatar
                      emoji={item.avatarEmoji}
                      bgColor={item.avatarBgColor}
                      emojiSizeClass="text-sm"
                    />
                  ) : (
                    <AvatarFallback className="bg-surface text-foreground font-bold text-xs">
                      {(item.name ?? item.id)[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {item.kind === "community"
                      ? `c/${item.id}`
                      : (item.name ?? item.username ?? "")}
                  </span>
                  {item.kind === "user" && item.username && (
                    <span className="text-xs text-foreground-40 truncate">
                      u/{item.username}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </section>
        )}

        {/* Scoped recents - typed query history only, no user/community clicks */}
        {showScopedRecents && (
          <section>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                {t("search.recent_label")}
              </span>
              <button
                onClick={handleClearQueries}
                className="text-[10px] font-semibold text-brand hover:opacity-70 transition-opacity cursor-pointer"
              >
                {t("search.clear_all")}
              </button>
            </div>
            {recentQueries.map((q) => (
              <button
                key={q}
                onClick={() => handleSelectRecentQuery(q)}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-foreground/5 transition-colors cursor-pointer text-left"
              >
                <Search className="h-3.5 w-3.5 text-foreground-40 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">
                  {q}
                </span>
              </button>
            ))}
          </section>
        )}

        {/* Live suggestions - global pages only */}
        {showSuggestions && (
          <section>
            {isFetchingResults ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                {hasCommunities && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                        {t("search.communities_label")}
                      </span>
                    </div>
                    {suggestions!.communities.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCommunity(c)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-foreground/5 transition-colors cursor-pointer text-left"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0 border border-surface-border">
                          {c.image && <AvatarImage src={c.image} />}
                          {!c.image && c.avatarBgColor ? (
                            <IconAvatar
                              emoji={c.avatarEmoji}
                              bgColor={c.avatarBgColor}
                              emojiSizeClass="text-sm"
                            />
                          ) : (
                            <AvatarFallback className="bg-surface text-brand font-bold text-xs">
                              {c.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">
                            c/{c.name}
                          </span>
                          <span className="text-xs text-foreground-40 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {c._count.members}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {hasCommunities && hasUsers && (
                  <div className="border-t border-surface-border mx-4 my-1" />
                )}

                {hasUsers && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                        {t("search.users_label")}
                      </span>
                    </div>
                    {suggestions!.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-foreground/5 transition-colors cursor-pointer text-left"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {u.image && <AvatarImage src={u.image} />}
                          <AvatarFallback className="bg-surface text-foreground font-bold text-xs">
                            {(u.name ?? u.username ?? "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {u.name ?? u.username}
                          </span>
                          <span className="text-xs text-foreground-40 truncate">
                            u/{u.username}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {hasNoResults && (
                  <p className="py-8 text-center text-sm text-foreground-40 font-medium">
                    {t("search.no_results")}
                  </p>
                )}
              </>
            )}
          </section>
        )}
      </PopoverContent>
    </Popover>
  );
}
