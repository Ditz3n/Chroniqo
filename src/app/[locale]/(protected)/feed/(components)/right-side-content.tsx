// src/app/[locale]/(protected)/feed/(components)/right-side-content.tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/hooks/use-translation";
import { PostProps } from "@/types/app-types";
import Link from "next/link";
import useSWR from "swr";
import { RecentPostCard } from "./recent-post-card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function RightSideContent({ recentPosts: initialPosts }: PostProps) {
  const { t, locale } = useTranslation();

  const { data, mutate } = useSWR("/api/users/recent-posts", fetcher, {
    fallbackData: initialPosts ? { recentPosts: initialPosts } : undefined,
  });

  const recentPosts = data?.recentPosts || [];
  const showEmpty = recentPosts.length === 0;

  const handleClear = async () => {
    // Optimistic clear
    mutate({ recentPosts: [] }, false);
    try {
      await fetch("/api/users/recent-posts", { method: "DELETE" });
      mutate();
    } catch (error) {
      console.error("Failed to clear recent posts", error);
    }
  };

  return (
    <div className="hidden min-[1080px]:flex w-[312px] flex-shrink-0 flex-col gap-6 sticky top-[76px] h-[calc(100vh-88px-112px)] overflow-hidden">
      {/* Recent Posts Card */}
      <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-foreground/5 border-b border-surface-border flex-shrink-0">
          <span className="text-xs font-bold uppercase text-foreground-60 tracking-wider">
            {t("feedPage.recent_posts")}
          </span>
          {recentPosts.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors cursor-pointer"
            >
              {t("feedPage.clear")}
            </button>
          )}
        </div>

        {showEmpty ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-sm font-medium text-foreground-40">
            {t("feedPage.no_recent_posts")}
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col">
              {recentPosts.map(
                (post: {
                  id: string;
                  community: string;
                  authorUsername?: string;
                  authorImage?: string | null;
                  authorEmoji?: string | null;
                  authorBgColor?: string | null;
                  communityImage?: string | null;
                  communityEmoji?: string | null;
                  communityBgColor?: string | null;
                  timeAgo: string;
                  title: string;
                  likes: number;
                  comments: number;
                  media?:
                    | { kind: "image"; url: string }
                    | { kind: "youtube"; url: string }
                    | { kind: "video"; url: string; duration: string }
                    | { kind: "link"; url: string; siteName: string };
                }) => {
                  // Determine correct href based on if it's a community or profile post
                  const href =
                    post.community !== "Profile"
                      ? `/${locale}/communities/${post.community}/${post.id}`
                      : `/${locale}/u/${post.authorUsername}/${post.id}`;

                  return (
                    <Link
                      key={post.id}
                      href={href}
                      className="block border-b border-surface-border last:border-b-0 hover:bg-foreground/5 transition-colors"
                    >
                      <RecentPostCard
                        id={post.id}
                        community={
                          post.community !== "Profile"
                            ? `c/${post.community}`
                            : `u/${post.authorUsername}`
                        }
                        authorUsername={post.authorUsername}
                        authorImage={post.authorImage}
                        authorEmoji={post.authorEmoji}
                        authorBgColor={post.authorBgColor}
                        communityImage={post.communityImage}
                        communityEmoji={post.communityEmoji}
                        communityBgColor={post.communityBgColor}
                        timeAgo={post.timeAgo}
                        title={post.title}
                        likes={post.likes}
                        comments={post.comments}
                        media={post.media}
                      />
                    </Link>
                  );
                },
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer Links */}
      <div className="rounded-2xl border border-surface-border bg-transparent p-5 flex-shrink-0">
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs font-medium text-foreground-60">
          <Link
            href={`/${locale}/legal/about`}
            className="hover:text-foreground transition-colors"
          >
            {t("feedPage.footerAbout")}
          </Link>
          <Link
            href={`/${locale}/legal/help`}
            className="hover:text-foreground transition-colors"
          >
            {t("feedPage.footerHelp")}
          </Link>
          <Link
            href={`/${locale}/legal/privacy`}
            className="hover:text-foreground transition-colors"
          >
            {t("feedPage.footerPrivacy")}
          </Link>
        </div>
        <div className="mt-4 text-xs font-bold text-foreground-40 uppercase">
          © {new Date().getFullYear()} {t("feedPage.footer_copyright_brand")}
        </div>
      </div>
    </div>
  );
}
