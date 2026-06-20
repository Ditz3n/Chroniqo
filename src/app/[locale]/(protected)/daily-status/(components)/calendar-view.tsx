// src/app/[locale]/(protected)/daily-status/(components)/calendar-view.tsx
"use client";

import { Smiley } from "@/app/(components)/smiley";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { DAILY_STATUS_BG_CLASSES } from "@/lib/constants";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn, daySuffix } from "@/lib/utils";
import { DailyStatusData } from "@/types/app-types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DailyStatusEditor } from "./daily-status-editor";

export function CalendarView({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statuses, setStatuses] = useState<Record<number, DailyStatusData>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Animation and Selection State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeStatus, setActiveStatus] = useState<DailyStatusData | undefined>(
    undefined,
  );

  // Disable transitions during window resize to prevent breakpoint snap animations
  const trackRef = useRef<HTMLDivElement>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const editorInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handler = () => {
      // Directly kill transitions on the elements - synchronous, no render delay
      [trackRef, editorPanelRef, editorInnerRef].forEach((r) => {
        if (r.current) r.current.style.transition = "none";
      });
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        [trackRef, editorPanelRef, editorInnerRef].forEach((r) => {
          if (r.current) r.current.style.transition = "";
        });
      }, 150);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchMonth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/daily-status/month?year=${year}&month=${month}`,
      );
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, DailyStatusData> = {};
        data.statuses.forEach((s: DailyStatusData) => {
          const day = new Date(s.date).getDate();
          map[day] = s;
        });
        setStatuses(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  // Keep the active status updated if we refetch the month that contains the selected date
  useEffect(() => {
    if (
      selectedDate &&
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month
    ) {
      setActiveStatus(statuses[selectedDate.getDate()]);
    }
  }, [statuses, selectedDate, year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = t("calendar.months").split(",");
  const weekDays = t("calendar.weekdays").split(",");

  // Calculate the month names for tooltips
  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);
  const prevMonthName = monthNames[prevMonthDate.getMonth()];
  const nextMonthName = monthNames[nextMonthDate.getMonth()];

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    if (
      isOpen &&
      selectedDate?.getDate() === day &&
      selectedDate?.getMonth() === month &&
      selectedDate?.getFullYear() === year
    ) {
      handleClose();
      return;
    }
    setSelectedDate(clickedDate);
    setActiveStatus(statuses[day]);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Delay clearing the data so it doesn't flash empty during the slide-out animation
    setTimeout(() => setSelectedDate(null), 500);
  };

  // Formatting for the Editor
  const selectedDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : "";
  const displayDate = selectedDate
    ? `${daySuffix(selectedDate.getDate(), locale)} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : "";

  return (
    <div className="w-full h-full overflow-hidden">
      {/* Sliding track */}
      <div
        ref={trackRef}
        className={cn(
          "flex h-full xl:justify-center xl:gap-6 xl:translate-x-0 transition-transform duration-500 ease-in-out",
          isOpen ? "-translate-x-full xl:translate-x-0" : "translate-x-0",
        )}
      >
        {/* Calendar panel */}
        <div className="flex-shrink-0 w-full xl:w-[640px] flex justify-center px-4 xl:px-0 relative z-10">
          <div className="flex flex-col h-full w-full max-w-[640px] bg-surface border border-surface-border rounded-2xl p-4 sm:p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                {monthNames[month]} {year}
              </h2>
              <div className="flex gap-2">
                <Tooltip
                  content={t("calendar.prev_month_tooltip", {
                    month: prevMonthName,
                  })}
                >
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl border border-surface-border hover:bg-foreground/5 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </Tooltip>
                <Tooltip
                  content={t("calendar.next_month_tooltip", {
                    month: nextMonthName,
                  })}
                >
                  <button
                    onClick={handleNextMonth}
                    disabled={isCurrentMonth}
                    className="p-2 rounded-xl border border-surface-border hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-2.5 mb-2 flex-shrink-0 pl-2 pr-5">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs font-bold text-foreground-40 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            <ScrollArea className="flex-1 pr-3 w-full">
              <div className="grid grid-cols-7 gap-2 sm:gap-2.5 p-2">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square rounded-xl bg-transparent"
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = statuses[day];
                  const isToday = isCurrentMonth && day === today.getDate();
                  const isFuture = isCurrentMonth && day > today.getDate();

                  const isSelected =
                    isOpen &&
                    selectedDate?.getDate() === day &&
                    selectedDate?.getMonth() === month &&
                    selectedDate?.getFullYear() === year;

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (!isFuture) handleDayClick(day);
                      }}
                      disabled={isFuture}
                      className={cn(
                        "group relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 overflow-hidden",
                        status
                          ? DAILY_STATUS_BG_CLASSES[status.value]
                          : "bg-background border border-surface-border",
                        status ? "text-white" : "text-foreground-40",
                        !isFuture
                          ? "hover:scale-[1.03] cursor-pointer"
                          : "opacity-30 cursor-not-allowed",
                        isToday &&
                          !status &&
                          "border-brand border-2 text-foreground",
                        isSelected &&
                          "ring-4 ring-brand ring-offset-2 ring-offset-background",
                        isLoading && "animate-pulse",
                      )}
                    >
                      <span
                        className={cn(
                          "text-base sm:text-lg font-bold font-heading transition-opacity",
                          status && "md:group-hover:opacity-0",
                        )}
                      >
                        {day}
                      </span>

                      {status && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity p-2 pointer-events-none">
                          <div className="w-full h-full max-w-[2.5rem] max-h-[2.5rem]">
                            <Smiley statusValue={status.value} color="white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Editor panel */}
        <div
          ref={editorPanelRef}
          className={cn(
            "flex-shrink-0 w-full xl:w-[400px] flex justify-center px-4 xl:px-0 overflow-hidden relative z-0 transition-all duration-500 ease-in-out",
            isOpen ? "xl:mr-0 opacity-100" : "xl:-mr-[400px] opacity-0",
          )}
        >
          <div
            ref={editorInnerRef}
            className={cn(
              "w-[400px] h-full transition-transform duration-500 ease-in-out",
              isOpen ? "translate-x-0" : "xl:-translate-x-full",
            )}
          >
            <DailyStatusEditor
              dateStr={selectedDateStr}
              displayDate={displayDate}
              initialData={activeStatus}
              onClose={handleClose}
              onSaved={fetchMonth}
              onSuccess={handleClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
