// src/app/[locale]/(protected)/(components)/posts/poll-post.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { BarChart2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { PostActions } from "./post-actions";
import { PostHeader } from "./post-header";

import { PollPostProps } from "@/types/app-types";
import { useSWRConfig } from "swr";

export function PollPost({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView,
}: PollPostProps) {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();

  // Time remaining calculator
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (post.isClosed) return;

    const target = new Date(post.closesAt).getTime();

    const updateTime = () => {
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((target - now) / 1000));

      if (diffSeconds === 0) {
        setTimeLeft(t("post.poll_closed"));
        return;
      }

      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${t("post.poll_closes_in")} ${days}d`);
      } else if (hours > 0) {
        setTimeLeft(`${t("post.poll_closes_in")} ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${t("post.poll_closes_in")} ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, [post.closesAt, post.isClosed, t]);

  const [localVote, setLocalVote] = useState<string | null>(post.userVote);
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = post.totalVotes + (localVote && !post.userVote ? 1 : 0);
  const optionsWithVotes = post.options.map((opt) => ({
    ...opt,
    votes: opt.votes + (localVote === opt.id && !post.userVote ? 1 : 0),
  }));

  const handleVote = async (id: string) => {
    if (localVote || post.isClosed || isVoting) return;

    setIsVoting(true);
    setLocalVote(id); // Optimistic

    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: id }),
      });

      if (!res.ok) {
        setLocalVote(null); // Revert on failure
      } else {
        // Soft refresh feed data globally
        mutate(
          (key) => typeof key === "string" && key.includes("/api/"),
          undefined,
          { revalidate: true },
        );
      }
    } catch {
      setLocalVote(null);
    } finally {
      setIsVoting(false);
    }
  };

  const statusText = post.isClosed ? t("post.poll_closed") : timeLeft;
  const showResults = localVote !== null || post.isClosed;

  if (layout === "compact") {
    return (
      <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-foreground/5 cursor-pointer border-b border-surface-border transition-colors">
        <div className="w-20 h-20 rounded-xl bg-surface flex items-center justify-center flex-shrink-0 border border-surface-border">
          <BarChart2 className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <PostHeader
            post={post}
            layout="compact"
            hasPinnedPostInFeed={hasPinnedPostInFeed}
            onHideDelete={onHideDelete}
            currentTab={currentTab}
          />
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mt-0.5 mb-1 text-foreground">
            {post.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-foreground-40 mb-1">
            <BarChart2 className="h-3 w-3" />
            <span>
              {totalVotes} {t("post.poll_votes")}
            </span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span className={post.isClosed ? "text-brand font-semibold" : ""}>
              {statusText}
            </span>
          </div>
          <PostActions {...post} layout="compact" isAuthor={post.isAuthor} />
        </div>
      </div>
    );
  }

  const textBody = post.body || post.content;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden">
      <PostHeader
        post={post}
        layout="card"
        hasPinnedPostInFeed={hasPinnedPostInFeed}
        onHideDelete={onHideDelete}
        currentTab={currentTab}
      />
      <div className="px-4">
        <h2 className="font-heading font-bold text-xl leading-snug line-clamp-2 mb-2">
          {post.title}
        </h2>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-3 mb-3 text-xs text-foreground-40">
          <span className="flex items-center gap-1">
            <BarChart2 className="h-3.5 w-3.5" />
            {totalVotes} {t("post.poll_votes")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className={post.isClosed ? "text-brand font-semibold" : ""}>
              {statusText}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {optionsWithVotes.map((opt) => {
            const pct = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
            const isSelected = localVote === opt.id;

            return (
              <button
                key={opt.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVote(opt.id);
                }}
                disabled={showResults || isVoting}
                className={cn(
                  "relative w-full text-left rounded-xl overflow-hidden border transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  !showResults &&
                    "border-surface-border hover:border-brand/50 cursor-pointer hover:bg-brand/5",
                  showResults && isSelected && "border-brand",
                  showResults && !isSelected && "border-surface-border",
                  showResults && "cursor-default",
                )}
              >
                {showResults && (
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-xl",
                      isSelected ? "bg-brand/20" : "bg-foreground/5",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-4 py-3 z-10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border-2 flex-shrink-0 transition-all",
                        isSelected
                          ? "border-brand bg-brand shadow-[0_0_0_2px_var(--background)_inset]"
                          : "border-foreground-40 bg-transparent",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isSelected
                          ? "text-foreground font-semibold"
                          : "text-foreground-67",
                      )}
                    >
                      {opt.text}
                    </span>
                  </div>
                  {showResults && (
                    <span
                      className={cn(
                        "text-xs font-bold tabular-nums pl-4",
                        isSelected ? "text-brand" : "text-foreground-40",
                      )}
                    >
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p
          className={cn(
            "text-xs text-foreground-40 mt-3 transition-opacity duration-200",
            showResults && "hidden",
          )}
        >
          {t("post.poll_tap_to_vote")}
        </p>
      </div>

      {textBody && (
        <div className="px-4 mt-4 border-t border-surface-border/30">
          {isSingleView ? (
            <div className="py-3">
              <MarkdownRenderer content={textBody} />
            </div>
          ) : (
            <div
              className="relative py-3 max-h-[100px] overflow-hidden"
              style={{
                WebkitMaskImage:
                  "linear-gradient(180deg, #000 30%, transparent 100%)",
                maskImage:
                  "linear-gradient(180deg, #000 30%, transparent 100%)",
              }}
            >
              <MarkdownRenderer content={textBody} />
            </div>
          )}
        </div>
      )}

      <div className={textBody ? "pt-0" : "pt-4"}>
        <PostActions {...post} layout="card" isAuthor={post.isAuthor} />
      </div>
    </div>
  );
}
