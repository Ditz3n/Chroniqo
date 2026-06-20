// src/components/ui/date-picker.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type CalendarView = "days" | "months" | "years";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  max?: string; // "YYYY-MM-DD" - dates after this are disabled
  defaultViewDate?: string; // "YYYY-MM-DD" - date to show when opening with no value selected
  placeholder?: string;
  clearLabel?: string;
  disabled?: boolean;
}

function parseLocalDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toISOLocal(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const YEARS_PER_PAGE = 12;
const MIN_YEAR = 1900;

export function DatePicker({
  value,
  onChange,
  max,
  defaultViewDate,
  placeholder,
  clearLabel = "Clear",
  disabled,
}: DatePickerProps) {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("days");

  const selected = parseLocalDate(value);
  const maxDate = max ? parseLocalDate(max) : null;
  const maxYear = maxDate?.getFullYear() ?? new Date().getFullYear();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewYear, setViewYear] = useState(() => {
    if (selected && (!maxDate || selected <= maxDate))
      return selected.getFullYear();
    if (defaultViewDate) {
      const d = parseLocalDate(defaultViewDate);
      if (d) return d.getFullYear();
    }
    if (max) {
      const parts = max.split("-").map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) return parts[0];
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selected && (!maxDate || selected <= maxDate))
      return selected.getMonth();
    if (defaultViewDate) {
      const d = parseLocalDate(defaultViewDate);
      if (d) return d.getMonth();
    }
    if (max) {
      const parts = max.split("-").map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) return parts[1] - 1;
    }
    return new Date().getMonth();
  });

  // Year Grid Page: shows YEARS_PER_PAGE years ending at or near maxYear
  const [yearPageStart, setYearPageStart] = useState(() =>
    Math.max(MIN_YEAR, maxYear - YEARS_PER_PAGE + 1),
  );

  // Reset View State every time the popover opens
  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    if (newOpen) {
      const selectedInRange = selected && (!maxDate || selected <= maxDate);

      const anchor = selectedInRange
        ? selected
        : defaultViewDate
          ? parseLocalDate(defaultViewDate)
          : (maxDate ?? null);

      if (anchor) {
        setViewYear(anchor.getFullYear());
        setViewMonth(anchor.getMonth());
      }

      setCalendarView("days");
      const baseYear =
        anchor?.getFullYear() ??
        (max ? Number(max.split("-")[0]) : new Date().getFullYear());
      setYearPageStart(Math.max(MIN_YEAR, baseYear - YEARS_PER_PAGE + 1));
    }
    setOpen(newOpen);
  };

  // DAYS VIEW helpers

  const headerLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(new Date(viewYear, viewMonth, 1)),
    [locale, viewYear, viewMonth],
  );

  const dayNames = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" })
          .format(new Date(2025, 0, 6 + i))
          .slice(0, 2),
      ),
    [locale],
  );

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const pad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (Date | null)[] = Array(pad).fill(null);
    for (let d = 1; d <= daysInMonth; d++)
      arr.push(new Date(viewYear, viewMonth, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const isOutOfRange = (d: Date) => !!(maxDate && d > maxDate);

  const handleDay = (d: Date) => {
    if (isOutOfRange(d)) return;
    onChange(toISOLocal(d));
    setOpen(false);
  };

  // MONTHS VIEW helpers

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { month: "short" }).format(
          new Date(2025, i, 1),
        ),
      ),
    [locale],
  );

  const handleMonthSelect = (month: number) => {
    setViewMonth(month);
    setCalendarView("days");
  };

  // YEARS VIEW helpers

  const yearPageItems = Array.from(
    { length: YEARS_PER_PAGE },
    (_, i) => yearPageStart + i,
  );

  const handleYearSelect = (year: number) => {
    setViewYear(year);
    // Stay in months view so the user can then pick a month
    setCalendarView("months");
  };

  // Display

  const displayValue = selected
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selected)
    : "";

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl border border-surface-border bg-background text-sm transition-all cursor-pointer",
            "focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand",
            "data-[state=open]:border-brand data-[state=open]:ring-2 data-[state=open]:ring-brand",
            "hover:border-foreground-40",
            displayValue ? "text-foreground" : "text-foreground-40",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span>{displayValue || placeholder || "-"}</span>
          <CalendarDays className="h-4 w-4 text-foreground-40 flex-shrink-0 ml-2" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className="z-[100] w-72 rounded-2xl border border-surface-border bg-background p-4 shadow-xl outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {/* DAYS */}
          {calendarView === "days" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Clicking Header/Month Picker */}
                <button
                  type="button"
                  onClick={() => setCalendarView("months")}
                  className="flex items-center gap-1 text-sm font-semibold text-foreground capitalize hover:text-brand transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-foreground/5"
                >
                  {headerLabel}
                  <ChevronRight className="h-3 w-3 rotate-90 text-foreground-40" />
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {dayNames.map((n, i) => (
                  <div
                    key={i}
                    className="text-center text-xs font-semibold text-foreground-40 py-1 capitalize"
                  >
                    {n}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />;
                  const isSel = !!(selected && sameDay(day, selected));
                  const isToday = sameDay(day, today);
                  const oor = isOutOfRange(day);

                  return (
                    <button
                      key={toISOLocal(day)}
                      type="button"
                      disabled={oor}
                      onClick={() => handleDay(day)}
                      className={cn(
                        "h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-sm transition-colors",
                        isSel &&
                          "bg-brand text-white font-semibold cursor-default",
                        !isSel &&
                          isToday &&
                          "ring-1 ring-brand text-brand font-semibold hover:bg-foreground/5 cursor-pointer",
                        !isSel &&
                          !isToday &&
                          !oor &&
                          "text-foreground hover:bg-foreground/5 cursor-pointer",
                        oor &&
                          "text-foreground-40 opacity-40 cursor-not-allowed",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MONTHS */}
          {calendarView === "months" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Clicking Year/Year Picker */}
                <button
                  type="button"
                  onClick={() => {
                    setYearPageStart(
                      Math.max(MIN_YEAR, viewYear - YEARS_PER_PAGE + 1),
                    );
                    setCalendarView("years");
                  }}
                  className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-brand transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-foreground/5"
                >
                  {viewYear}
                  <ChevronRight className="h-3 w-3 rotate-90 text-foreground-40" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {monthNames.map((name, i) => {
                  const isSelectedMonth = !!(
                    selected &&
                    selected.getFullYear() === viewYear &&
                    selected.getMonth() === i
                  );
                  const isViewedMonth = !isSelectedMonth && viewMonth === i;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleMonthSelect(i)}
                      className={cn(
                        "py-2.5 px-1 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize",
                        isSelectedMonth && "bg-brand text-white",
                        isViewedMonth &&
                          "ring-1 ring-brand text-brand hover:bg-foreground/5",
                        !isSelectedMonth &&
                          !isViewedMonth &&
                          "text-foreground hover:bg-foreground/5",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* YEARS */}
          {calendarView === "years" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setYearPageStart((s) =>
                      Math.max(MIN_YEAR, s - YEARS_PER_PAGE),
                    )
                  }
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-foreground">
                  {yearPageStart} - {yearPageStart + YEARS_PER_PAGE - 1}
                </span>
                <button
                  type="button"
                  onClick={() => setYearPageStart((s) => s + YEARS_PER_PAGE)}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-foreground-60 hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {yearPageItems.map((year) => {
                  const isDisabled = year > maxYear || year < MIN_YEAR;
                  const isSelected = viewYear === year;

                  return (
                    <button
                      key={year}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleYearSelect(year)}
                      className={cn(
                        "py-2.5 px-1 rounded-lg text-sm font-medium transition-colors",
                        isSelected && "bg-brand text-white cursor-default",
                        !isSelected &&
                          !isDisabled &&
                          "text-foreground hover:bg-foreground/5 cursor-pointer",
                        isDisabled &&
                          "text-foreground-40 opacity-30 cursor-not-allowed",
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Clear */}
          {value && (
            <div className="mt-3 pt-3 border-t border-surface-border flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                {clearLabel}
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
