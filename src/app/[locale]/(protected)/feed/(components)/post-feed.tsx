// src/app/[locale]/(protected)/feed/(components)/post-feed.tsx
"use client";

import { useTodayStatus } from "@/lib/hooks/use-chat";
import { usePosts } from "@/lib/hooks/use-posts";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Post, PostFeedProps, PostLayout } from "@/types/app-types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { PostRenderer } from "../../(components)/posts/post-renderer";

// Wrapper handles smooth collapsing without disrupting SWR data
const PostItemWrapper = memo(function PostItemWrapper({
  post,
  layout,
  hasPinnedPostInFeed,
  currentTab,
  index,
}: {
  post: Post;
  layout: PostLayout;
  hasPinnedPostInFeed: boolean;
  currentTab?: string;
  index: number;
}) {
  const isPriority = index < 2;
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isVisible, setIsVisible] = useState(isPriority);

  const cardRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { locale } = useTranslation();

  useEffect(() => {
    if (isPriority) return;

    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: "80px 0px" },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [isPriority]);

  const staggerDelay = Math.min(index, 8) * 70;

  if (isRemoved) return null;

  const postUrl = post.communityId
    ? `/${locale}/communities/${post.community}/${post.id}`
    : `/${locale}/u/${post.authorUsername}/${post.id}`;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Ignore React-portal events (e.g. report modal inputs) that bubble through
    // the React tree but are not actually inside this card's DOM.
    if (!e.currentTarget.contains(target)) {
      return;
    }
    // Keep card navigation from firing when interacting with controls inside the post.
    if (target.closest("button, a, [role='button'], [role='menuitem']")) {
      return;
    }
    router.push(postUrl);
  };

  return (
    <div
      className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin,transform] duration-500 ease-in-out origin-top ${
        isRemoving
          ? `grid-rows-[0fr] opacity-0 scale-[0.98] pointer-events-none ${layout === "card" ? "-mb-4" : ""}`
          : "grid-rows-[1fr] opacity-100 scale-100"
      }`}
      onTransitionEnd={(e) => {
        if (isRemoving && e.target === e.currentTarget) {
          setIsRemoved(true);
        }
      }}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          ref={cardRef}
          onClick={handleCardClick}
          style={
            isVisible && !isPriority
              ? { animationDelay: `${staggerDelay}ms` }
              : undefined
          }
          className={`group/postcard relative cursor-pointer rounded-2xl will-change-transform ${
            !isVisible
              ? "opacity-0"
              : isPriority
                ? "opacity-100"
                : "animate-post-enter"
          }`}
        >
          <PostRenderer
            post={post}
            layout={layout}
            hasPinnedPostInFeed={hasPinnedPostInFeed}
            onHideDelete={() => setIsRemoving(true)} // Passed down to PostHeader
            currentTab={currentTab}
            isPriority={index < 2}
          />
          {layout === "card" && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none transition-colors duration-150 group-hover/postcard:bg-foreground/[0.04]" />
          )}
        </div>
      </div>
    </div>
  );
});

export function PostFeed({
  layout,
  sort,
  communityName,
  username,
  tab,
}: PostFeedProps) {
  const { t } = useTranslation();
  const { data: todayData } = useTodayStatus();
  const {
    posts,
    isLoading,
    isLoadingMore,
    size,
    setSize,
    isReachingEnd,
    isEmpty,
  } = usePosts({ communityName, username, tab, sort });

  const observerTarget = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPageReached, setMaxPageReached] = useState(1);

  // Energy logic: 0 = Exhausted, 1 = Low Energy
  const isLowEnergyMode = todayData?.status && todayData.status.value <= 1;

  // Track if any post in the feed is pinned (to disable pin button on others)
  const hasPinnedPostInFeed = posts.some((p) => p.isPinned);

  // Infinite scroll intersection observer (only active if NOT in low energy mode)
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (
        target.isIntersecting &&
        !isReachingEnd &&
        !isLoadingMore &&
        !isLowEnergyMode
      ) {
        setSize(size + 1);
      }
    },
    [isReachingEnd, isLoadingMore, setSize, size, isLowEnergyMode],
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "200px",
    });
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  // Determine which posts to render
  let displayPosts = posts;
  if (isLowEnergyMode) {
    // Pagination slicing: Show only the posts belonging to `currentPage`
    const startIndex = (currentPage - 1) * 10;
    const endIndex = startIndex + 10;
    displayPosts = posts.slice(startIndex, endIndex);
  }

  return (
    <div className="flex flex-col w-full">
      <div
        className={
          layout === "compact"
            ? "flex flex-col rounded-2xl border border-surface-border bg-surface overflow-hidden w-full"
            : "flex flex-col gap-4 w-full"
        }
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface border border-surface-border rounded-2xl text-foreground-40 origin-top animate-feed-empty-unfold">
            <p className="text-sm font-medium">{t("feedPage.no_posts_yet")}</p>
          </div>
        ) : (
          displayPosts.map((post, index) => (
            <PostItemWrapper
              key={post.id}
              post={post}
              index={index}
              layout={layout}
              hasPinnedPostInFeed={hasPinnedPostInFeed}
              currentTab={tab}
            />
          ))
        )}
      </div>

      {/* Pagination / Infinite Scroll boundary */}
      {!isEmpty && (
        <div
          ref={observerTarget}
          className="w-full py-8 flex flex-col items-center justify-center"
        >
          {isLoadingMore && !isLowEnergyMode ? (
            <div className="h-6 w-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          ) : isLowEnergyMode && !isLoading ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage((p) => p - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                disabled={currentPage === 1}
                className="p-2 rounded-full border border-surface-border bg-surface text-foreground-60 hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-semibold text-foreground-60">
                {t("feedPage.page_x_of_y")
                  .replace("{{current}}", String(currentPage))
                  .replace(
                    "{{total}}",
                    maxPageReached > 1 ? String(maxPageReached) : "*",
                  )}
              </span>
              <button
                onClick={() => {
                  // If on the last fetched page and it's full, fetch more
                  if (currentPage === size && !isReachingEnd) {
                    setSize(size + 1).then(() => {
                      setCurrentPage((p) => {
                        const next = p + 1;
                        setMaxPageReached((prev) =>
                          next > prev ? next : prev,
                        );
                        return next;
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    });
                  } else if (currentPage < size) {
                    // If already fetched, just move to it
                    setCurrentPage((p) => {
                      const next = p + 1;
                      setMaxPageReached((prev) => (next > prev ? next : prev));
                      return next;
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                disabled={currentPage === size && isReachingEnd}
                className="p-2 rounded-full border border-surface-border bg-surface text-foreground-60 hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : isReachingEnd ? (
            <span className="text-xs font-semibold text-foreground-40 tracking-wider uppercase">
              {t("feedPage.end_of_feed")}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
