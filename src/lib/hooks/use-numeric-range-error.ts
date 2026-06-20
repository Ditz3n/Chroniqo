// src/lib/hooks/use-numeric-range-error.ts
import { useMemo } from "react";

type TranslationFn = (key: string, params?: Record<string, string>) => string;

export function useNumericRangeError({
  value,
  min,
  max,
  t,
}: {
  value: number | null | undefined;
  min: number;
  max: number;
  t: TranslationFn;
}): string | null {
  return useMemo(() => {
    if (value == null) return null;
    if (value < min || value > max) {
      return t("settings.field_range_error", {
        min: String(min),
        max: String(max),
      });
    }
    return null;
  }, [max, min, t, value]);
}
