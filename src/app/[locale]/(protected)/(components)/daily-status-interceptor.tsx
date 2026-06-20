// src/app/[locale]/(protected)/(components)/daily-status-interceptor.tsx
"use client";

import { DailyStatusSlider } from "@/app/(components)/daily-status-slider";
import { Smiley } from "@/app/(components)/smiley";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDailyStatus } from "@/context/daily-status-context";
import { DAILY_STATUS_BG_CLASSES, DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { getDailyStatusFeedback } from "@/lib/utils/daily-status-feedback";
import { SaveState } from "@/types/app-types";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";

// Height for Feedback Panel to animate to on success/failure
const FEEDBACK_HEIGHT = 340;

export function DailyStatusInterceptor() {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const {
    hasRegistered,
    isChecking,
    markRegistered,
    resetTrigger,
    interceptorInitialValue,
    pendingDebugTest,
    consumeDebugTest,
  } = useDailyStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [statusValue, setStatusValue] = useState(
    interceptorInitialValue != null &&
      interceptorInitialValue >= 0 &&
      interceptorInitialValue <= 4
      ? interceptorInitialValue
      : 2,
  );

  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    "auto",
  );

  const formRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const smileyPlaceholderRef = useRef<HTMLDivElement>(null);
  const pendingTestRef = useRef<null | "success" | "error">(null);
  const [smileyFormY, setSmileyFormY] = useState(120);

  // Fetch existing status when modal opens
  useEffect(() => {
    if (isOpen) {
      if (interceptorInitialValue !== null) {
        setStatusValue(interceptorInitialValue);
      }
      fetch("/api/daily-status/today")
        .then((res) => res.json())
        .then((data) => {
          if (data.status) {
            setStatusValue(data.status.value);
            setNote(data.status.note || "");
          } else {
            const onboardingPrefill = localStorage.getItem(
              "chroniqo_onboarding_mood",
            );
            if (onboardingPrefill) {
              try {
                const parsed = JSON.parse(onboardingPrefill);
                setStatusValue(parsed.value ?? 2);
                setNote(parsed.note ?? "");
              } catch {
                if (interceptorInitialValue === null) setStatusValue(2);
                setNote("");
              }
              localStorage.removeItem("chroniqo_onboarding_mood");
            } else {
              if (interceptorInitialValue === null) setStatusValue(2);
              setNote("");
            }
          }
        })
        .catch((err) => console.error("Failed to fetch today's status", err));
    }
  }, [isOpen, interceptorInitialValue]);

  useEffect(() => {
    if (pendingDebugTest) {
      pendingTestRef.current = pendingDebugTest;
      consumeDebugTest();
    }
  }, [pendingDebugTest, consumeDebugTest]);

  useEffect(() => {
    if (!isChecking && !hasRegistered) {
      const hasSkipped = sessionStorage.getItem("skippedDailyStatus");
      if (hasSkipped !== "true") {
        // Mirror the RememberMeWatcher guard: Dialog portals render to document.body
        // and escape the #protected-app-root display:none rule, so we must suppress
        // the modal here if the session is about to be terminated.
        const hasSession = sessionStorage.getItem("chroniqo_session");
        if (!hasSession) {
          const rememberData = localStorage.getItem("chroniqo_remember");
          const expiry = rememberData ? parseInt(rememberData, 10) : NaN;
          if (isNaN(expiry) || Date.now() > expiry) {
            return; // RememberMeWatcher will handle the signOut redirect
          }
        }
        setIsOpen(true);
      }
    }
  }, [isChecking, hasRegistered, resetTrigger]);

  useEffect(() => {
    if (!isOpen) return;
    if (!pendingTestRef.current) return;

    const testType = pendingTestRef.current;
    pendingTestRef.current = null;

    const timer = setTimeout(() => {
      triggerFeedback(testType);
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (outerRef.current && smileyPlaceholderRef.current) {
          const outerRect = outerRef.current.getBoundingClientRect();
          const smileyRect =
            smileyPlaceholderRef.current.getBoundingClientRect();
          setSmileyFormY(smileyRect.top - outerRect.top);
        }
      });
    }
  }, [isOpen]);

  const resetState = () => {
    setSaveState("idle");
    setShowingFeedback(false);
    setFeedbackVisible(false);
    setContainerHeight("auto");
    setNote("");
    setStatusValue(2);
  };

  const handleSkip = () => {
    sessionStorage.setItem("skippedDailyStatus", "true");
    setIsOpen(false);
    setTimeout(resetState, 300);
  };

  const triggerFeedback = (state: "success" | "error") => {
    const currentH = formRef.current?.scrollHeight ?? 420;
    setContainerHeight(currentH);

    setSaveState(state);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setContainerHeight(FEEDBACK_HEIGHT);
        setShowingFeedback(true);
        setTimeout(() => setFeedbackVisible(true), 50);
      });
    });

    const delay = state === "success" ? 4000 : 3200;

    setTimeout(() => {
      if (state === "success") markRegistered(statusValue);
      setIsOpen(false);
      setTimeout(resetState, 300);
    }, delay);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/daily-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: statusValue, note }),
      });

      if (res.ok) {
        mutate("/api/daily-status/today");
        triggerFeedback("success");
      } else {
        triggerFeedback("error");
      }
    } catch (err) {
      console.error("Failed to save status", err);
      triggerFeedback("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) return null;

  const bgClass = DAILY_STATUS_BG_CLASSES[statusValue];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleSkip();
      }}
    >
      <DialogContent className="p-0 overflow-hidden sm:max-w-md gap-0 border-0 max-h-[90dvh] flex flex-col bg-surface-opaque">
        <div
          ref={outerRef}
          className="relative flex flex-col overflow-hidden"
          style={{
            height: containerHeight === "auto" ? "auto" : containerHeight,
            transition: "height 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Main Form */}
          <div
            ref={formRef}
            style={{
              opacity: showingFeedback ? 0 : 1,
              transition: "opacity 0.3s ease",
              pointerEvents: showingFeedback ? "none" : "auto",
            }}
          >
            <ScrollArea maxHeight="90dvh" className="overflow-y-auto">
              <div
                className={`w-full pt-6 pb-5 px-6 flex flex-col items-center gap-4 relative transition-colors duration-300 ${bgClass}`}
              >
                <div className="text-center z-10 flex flex-col items-center">
                  <DialogTitle className="text-lg font-bold font-heading text-white mb-1 text-center border-none p-0">
                    {t("dailyStatus.interceptor_title")}
                  </DialogTitle>
                  <p className="text-white/90 text-sm font-medium drop-shadow-sm">
                    {t("dailyStatus.interceptor_desc")}
                  </p>
                </div>
                {/* Smiley - anchored in layout flow so it scrolls with content, measured for feedback animation offset */}{" "}
                <div
                  ref={smileyPlaceholderRef}
                  className="z-10 h-20 w-20 relative"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: showingFeedback
                        ? `translateY(${FEEDBACK_HEIGHT / 2 - smileyFormY - 40}px)`
                        : "none",
                      transition: showingFeedback
                        ? "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)"
                        : "none",
                    }}
                  >
                    <Smiley statusValue={statusValue} />
                  </div>
                </div>
                <div className="z-10 bg-black/20 text-white px-4 py-1.5 rounded-full text-sm font-bold">
                  {DAILY_STATUSES[statusValue] &&
                    t(DAILY_STATUSES[statusValue].labelKey)}
                </div>
                <div className="w-full px-4 z-10">
                  <DailyStatusSlider
                    value={statusValue}
                    onChange={setStatusValue}
                  />
                </div>
              </div>

              <div className="p-5 bg-surface-opaque flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="relative rounded-xl border border-surface-border bg-surface-opaque transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand flex flex-col">
                    <textarea
                      rows={3}
                      maxLength={250}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-4 pt-6 pb-3 rounded-xl bg-surface-opaque text-foreground focus:outline-none outline-none ring-0 focus:ring-0 resize-none transition-all text-sm"
                    />
                    <label
                      className="absolute left-3 top-4 text-sm text-foreground-60 transition-all duration-200 pointer-events-none px-1
                        peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-brand
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs label-bg"
                    >
                      {t("dailyStatus.note_placeholder")}
                    </label>
                  </div>
                  <div className="text-right text-xs text-foreground-40 font-medium">
                    {note.length} / 250
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className={`w-full py-5 rounded-xl text-base font-bold text-white hover:opacity-90 transition-colors duration-300 ${bgClass}`}
                  >
                    {isLoading
                      ? t("dailyStatus.saving")
                      : t("dailyStatus.save")}
                  </Button>
                  <button
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="w-full py-2.5 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {t("dailyStatus.skip")}
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Feedback Overlay */}
          {saveState !== "idle" && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 ${saveState === "success" ? bgClass : ""}`}
              style={{
                backgroundColor:
                  saveState === "error" ? "var(--feedback-error)" : undefined,
                opacity: showingFeedback ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
            >
              <p
                className="text-white font-heading font-bold text-xl tracking-wide drop-shadow-sm"
                style={{
                  opacity: feedbackVisible ? 1 : 0,
                  transition: "opacity 0.5s ease 0.15s",
                }}
              >
                {saveState === "success"
                  ? t("dailyStatus.success_title")
                  : t("dailyStatus.error_title")}
              </p>

              {/* Smiley - shown in feedback overlay on save */}
              <div className="h-20 w-20">
                <Smiley statusValue={statusValue} />
              </div>

              <p
                className="text-white/90 text-base font-semibold text-center leading-relaxed max-w-xs drop-shadow-sm"
                style={{
                  opacity: feedbackVisible ? 1 : 0,
                  transition: "opacity 0.5s ease 0.3s",
                }}
              >
                {saveState === "success"
                  ? getDailyStatusFeedback(statusValue, t)
                  : t("dailyStatus.error_desc")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
