// src/app/[locale]/(protected)/daily-status/(components)/daily-status-editor.tsx
"use client";

import { DailyStatusSlider } from "@/app/(components)/daily-status-slider";
import { Smiley } from "@/app/(components)/smiley";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { useDailyStatus } from "@/context/daily-status-context";
import { DAILY_STATUS_BG_CLASSES, DAILY_STATUSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { getDailyStatusFeedback } from "@/lib/utils/daily-status-feedback";
import { DailyStatusEditorProps, SaveState } from "@/types/app-types";
import { RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Neutral status value used exclusively during the reset animation
const RESET_SMILEY_VALUE = 2;

export function DailyStatusEditor({
  dateStr,
  displayDate,
  initialData,
  onClose,
  onSaved,
  onSuccess,
}: DailyStatusEditorProps) {
  const { t } = useTranslation();
  const [statusValue, setStatusValue] = useState(2);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!initialData;

  const { markRegistered, markUnregistered } = useDailyStatus();

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [smileyFormY, setSmileyFormY] = useState(0);
  const [smileyTargetY, setSmileyTargetY] = useState(0);

  const [suppressColorTransition, setSuppressColorTransition] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const smileyPlaceholderRef = useRef<HTMLDivElement>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset feedback state only when the selected date changes.
  useEffect(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setSaveState("idle");
    setShowingFeedback(false);
    setFeedbackVisible(false);
    // Suppress color transition so the new date opens in the correct color immediately
    setSuppressColorTransition(true);
    const t = setTimeout(() => setSuppressColorTransition(false), 50);
    // Reset form values immediately on date change to prevent old color/note flash
    setStatusValue(initialData?.value ?? 2);
    setNote(initialData?.note ?? "");
    return () => clearTimeout(t);
  }, [dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync form values whenever the date or its data changes
  useEffect(() => {
    if (initialData) {
      setStatusValue(initialData.value);
      setNote(initialData.note || "");
    } else {
      setStatusValue(2);
      setNote("");
    }
  }, [initialData, dateStr]);

  // Measure smiley placeholder position for the form→feedback animation
  useEffect(() => {
    requestAnimationFrame(() => {
      if (outerRef.current && smileyPlaceholderRef.current) {
        const outerRect = outerRef.current.getBoundingClientRect();
        const smileyRect = smileyPlaceholderRef.current.getBoundingClientRect();
        setSmileyFormY(smileyRect.top - outerRect.top);
      }
    });
  }, [dateStr]);

  const triggerFeedback = (state: "success" | "error" | "reset") => {
    // Measure target Y at trigger time - panel is fully rendered by now
    if (outerRef.current) {
      const smileyH =
        smileyPlaceholderRef.current?.getBoundingClientRect().height ?? 112;
      setSmileyTargetY(
        outerRef.current.getBoundingClientRect().height / 2 - smileyH / 2,
      );
    }
    setSaveState(state);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowingFeedback(true);
        setTimeout(() => setFeedbackVisible(true), 50);
      });
    });

    const delay = state === "error" ? 2800 : 3500;

    feedbackTimerRef.current = setTimeout(() => {
      feedbackTimerRef.current = null;
      if (state === "success" || state === "reset") {
        onSuccess();
      } else {
        setShowingFeedback(false);
        setFeedbackVisible(false);
        setTimeout(() => setSaveState("idle"), 400);
      }
    }, delay);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/daily-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: statusValue, note, date: dateStr }),
      });

      if (res.ok) {
        onSaved();
        const todayStr = new Date().toLocaleDateString("en-CA");
        if (dateStr === todayStr) {
          markRegistered(statusValue);
        }
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

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/daily-status", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      if (res.ok) {
        onSaved(); // Refresh the calendar immediately
        const todayStr = new Date().toLocaleDateString("en-CA");
        if (dateStr === todayStr && markUnregistered) {
          markUnregistered();
        }
        triggerFeedback("reset");
      } else {
        triggerFeedback("error");
      }
    } catch (err) {
      console.error("Failed to reset status", err);
      triggerFeedback("error");
    } finally {
      setIsLoading(false);
    }
  };

  const currentColorClass = DAILY_STATUS_BG_CLASSES[statusValue];

  // Which smiley value to display on the floating animation element
  const floatingSmileyValue =
    saveState === "reset" ? RESET_SMILEY_VALUE : statusValue;

  return (
    <div
      ref={outerRef}
      className="h-full w-full bg-surface border border-surface-border rounded-2xl overflow-hidden relative"
    >
      {/* Floating Smiley - only mounted during feedback animation */}
      {saveState !== "idle" && (
        <div
          className="absolute left-1/2 z-20 h-28 w-28 sm:h-36 sm:w-36 pointer-events-none"
          style={{
            top: 0,
            transform: showingFeedback
              ? `translateX(-50%) translateY(${smileyTargetY}px)`
              : `translateX(-50%) translateY(${smileyFormY}px)`,
            transition: showingFeedback
              ? "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
            // Desaturate the smiley to gray during the reset animation
            filter: saveState === "reset" ? "grayscale(1)" : undefined,
          }}
        >
          <Smiley statusValue={floatingSmileyValue} />
        </div>
      )}

      <ScrollArea
        className="h-full w-full"
        flexContent
        style={{
          opacity: showingFeedback ? 0 : 1,
          transition: "opacity 0.3s ease",
          pointerEvents: showingFeedback ? "none" : "auto",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Top colored section */}
          <div
            className={`w-full pt-8 pb-6 px-4 sm:pt-10 sm:pb-8 sm:px-6 flex flex-col items-center gap-4 sm:gap-6 relative flex-shrink-0 ${currentColorClass} ${suppressColorTransition ? "" : "transition-colors duration-500"}`}
          >
            <Tooltip content={t("dailyStatus.close_tooltip")}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </Tooltip>

            {/* Reset button - only shown when editing an existing status */}
            {isEditing && (
              <Tooltip content={t("dailyStatus.reset_tooltip")}>
                <button
                  onClick={handleReset}
                  disabled={isLoading || showingFeedback}
                  className="absolute top-4 left-4 p-2 rounded-full text-white transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  <RotateCcw size={20} />
                </button>
              </Tooltip>
            )}

            <div className="text-center z-10">
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-white mb-0.5 sm:mb-1 drop-shadow-md">
                {displayDate}
              </h2>
              <p className="text-white/90 text-xs sm:text-sm font-medium drop-shadow-sm">
                {isEditing
                  ? t("calendar.edit_status")
                  : t("calendar.log_status")}
              </p>
            </div>

            {/* Placeholder - keeps layout space, measured for smiley animation */}
            <div
              ref={smileyPlaceholderRef}
              className="z-10 w-28 h-28 sm:w-36 sm:h-36 sm:mb-2"
            >
              {saveState === "idle" && <Smiley statusValue={statusValue} />}
            </div>

            <div className="z-10 bg-black/20 text-white px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold">
              {t(DAILY_STATUSES[statusValue].labelKey)}
            </div>

            <div className="w-full px-2 sm:px-4 z-10 mt-1 sm:mt-2">
              <DailyStatusSlider
                value={statusValue}
                onChange={setStatusValue}
              />
            </div>
          </div>

          {/* Bottom section */}
          <div className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 flex-1">
            <div className="flex flex-col gap-2 flex-1">
              <div className="relative rounded-xl border border-surface-border transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand flex flex-col flex-1">
                <textarea
                  rows={4}
                  maxLength={250}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder=" "
                  className="peer w-full flex-1 px-4 pt-6 pb-3 rounded-xl bg-transparent text-foreground focus:outline-none outline-none ring-0 focus:ring-0 resize-none transition-all text-sm sm:text-base"
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

            <Button
              onClick={handleSave}
              disabled={isLoading || showingFeedback}
              className={`w-full py-5 sm:py-6 rounded-xl text-sm sm:text-base font-bold text-white hover:opacity-90 flex-shrink-0 ${currentColorClass} ${suppressColorTransition ? "" : "transition-colors duration-500"}`}
            >
              {isLoading
                ? t("dailyStatus.saving")
                : isEditing
                  ? t("dailyStatus.update")
                  : t("dailyStatus.save")}
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Feedback Overlay */}
      {saveState !== "idle" && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 rounded-2xl ${saveState === "success" ? currentColorClass : ""}`}
          style={{
            backgroundColor:
              saveState === "error"
                ? "var(--feedback-error)"
                : saveState === "reset"
                  ? "var(--surface-opaque)"
                  : undefined,
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
              : saveState === "reset"
                ? t("dailyStatus.reset_title")
                : t("dailyStatus.error_title")}
          </p>

          {/* Spacer - floating smiley animates to this position */}
          <div
            className="h-28 w-28 sm:h-36 sm:w-36"
            style={{
              filter: saveState === "reset" ? "grayscale(1)" : undefined,
            }}
          />

          <p
            className="text-white/90 text-base font-semibold text-center leading-relaxed max-w-xs drop-shadow-sm"
            style={{
              opacity: feedbackVisible ? 1 : 0,
              transition: "opacity 0.5s ease 0.3s",
            }}
          >
            {saveState === "success"
              ? getDailyStatusFeedback(statusValue, t)
              : saveState === "reset"
                ? t("dailyStatus.reset_desc")
                : t("dailyStatus.error_desc")}
          </p>
        </div>
      )}
    </div>
  );
}
