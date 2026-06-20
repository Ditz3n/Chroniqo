// src/app/[locale]/(protected)/admin/(components)/dummy-data-generator.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/use-translation";
import { GenStep } from "@/types/app-types";
import { Check, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function DummyDataGenerator() {
  const { t, locale } = useTranslation();
  const { data, mutate } = useSWR("/api/admin/dummy-data", fetcher);

  useEffect(() => {
    const steps = data?.steps as GenStep[] | null;
    const isRunning = steps?.some(
      (s) => s.status === "loading" || s.status === "pending",
    );
    if (!isRunning && !data?.isLocked) return;
    const id = setInterval(() => mutate(), 2000);
    return () => clearInterval(id);
  }, [data, mutate]);

  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const steps: GenStep[] | null = data?.steps;
  const isLocked = data?.isLocked;
  const isRunning = steps && steps.some((s) => s.status === "loading");
  const isError = steps && steps.some((s) => s.status === "error");

  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    const steps = data?.steps as GenStep[] | null;
    const isComplete = steps && steps.every((s) => s.status === "done");
    if (!isComplete) return;

    const id = setTimeout(() => setIsFadingOut(true), 13000);
    return () => clearTimeout(id);
  }, [data?.steps]);

  const getStepLabel = (stepId: string) => {
    const keyMap: Record<string, string> = {
      init: "admin.dummy_step_init",
      cleanup: "admin.dummy_step_cleanup",
      users: "admin.dummy_step_users",
      friends: "admin.dummy_step_friends",
      communities: "admin.dummy_step_communities",
      posts: "admin.dummy_step_posts",
      comments: "admin.dummy_step_comments",
      chats: "admin.dummy_step_chats",
      reports: "admin.dummy_step_reports",
    };

    return t(keyMap[stepId] || "admin.generating");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!data?.lockData?.timestamp) {
        setTimeLeft(null);
        return;
      }
      const lockTime = data.lockData.timestamp;
      const unlockTime = lockTime + 24 * 60 * 60 * 1000;
      const diff = unlockTime - Date.now();

      if (diff <= 0) {
        setTimeLeft(null);
        mutate();
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60))
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        .toString()
        .padStart(2, "0");
      const s = Math.floor((diff % (1000 * 60)) / 1000)
        .toString()
        .padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.lockData, mutate]);

  const handleGenerate = async () => {
    setIsFadingOut(false);
    setIsExpanding(true);
    setTimeout(() => setIsExpanding(false), 50); // let collapsed state render first, then expand
    const optimisticSteps: GenStep[] = [{ id: "init", status: "loading" }];
    mutate({ ...data, steps: optimisticSteps }, { revalidate: false });
    await fetch("/api/admin/dummy-data", { method: "POST" });
    mutate();
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-surface border border-surface-border rounded-2xl animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold font-heading text-foreground">
          {t("admin.dummy_generator_title")}
        </h2>
        <p className="text-sm text-foreground-60 leading-relaxed">
          {t("admin.dummy_generator_desc")}
        </p>
      </div>

      <div className="flex flex-col">
        {steps && (
          <div
            className="dummy-steps"
            data-collapsed={isFadingOut || isExpanding}
          >
            <div className="flex flex-col gap-3 p-4 bg-background rounded-xl border border-surface-border">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                {t("admin.status")}
              </span>
              <div className="flex flex-col gap-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {step.status === "done" && (
                          <Check className="w-4 h-4 text-feedback-success" />
                        )}
                        {step.status === "loading" && (
                          <Loader2 className="w-4 h-4 text-brand animate-spin" />
                        )}
                        {step.status === "error" && (
                          <XCircle className="w-4 h-4 text-feedback-error" />
                        )}
                        {step.status === "pending" && (
                          <div className="w-2 h-2 rounded-full bg-surface-border" />
                        )}
                      </div>
                      <span
                        className={
                          step.status === "loading" || step.status === "done"
                            ? "text-foreground"
                            : step.status === "error"
                              ? "text-feedback-error"
                              : "text-foreground-40"
                        }
                      >
                        {getStepLabel(step.id)}
                      </span>
                    </div>
                    {step.status === "error" && step.error && (
                      <div className="text-xs text-feedback-error ml-8 bg-feedback-error/10 border border-feedback-error/20 p-2 rounded-md font-mono break-all mt-1">
                        {step.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {steps.every((s) => s.status === "done") && (
                <div className="mt-2 text-sm font-bold text-feedback-success">
                  {t("admin.dummy_generator_success")}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {isLocked && !isError ? (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-warning">
                {t("admin.dummy_locked")}
              </span>
              <span className="text-foreground-60 flex items-center gap-1 flex-wrap">
                {t("admin.locked_by")}:
                <Link
                  href={`/${locale}/u/${data.lockData.adminUsername}`}
                  className="text-foreground hover:underline font-medium"
                >
                  u/{data.lockData.adminUsername}
                </Link>
              </span>
              {timeLeft && (
                <span className="text-foreground font-mono font-medium">
                  {t("admin.time_remaining")}: {timeLeft}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-foreground-60">
              {isError
                ? t("admin.dummy_error_ready") || "Ready to retry."
                : t("admin.dummy_ready")}
            </span>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isLocked || isRunning}
            variant="primary"
            className="transition-all w-full sm:w-auto"
          >
            {isRunning
              ? t("admin.generating")
              : isError
                ? t("admin.retry_btn") || "Retry Generation"
                : t("admin.generate_btn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
