// src/lib/utils/daily-status-feedback.ts
import { TranslationFn } from "@/types/app-types";

/**
 * Returns the level-specific supportive feedback message for a given daily
 * status value (0-4). Consumed by both the interceptor and the editor so the
 * message is authored in one place (US2.11).
 */
export function getDailyStatusFeedback(
  value: number,
  t: TranslationFn,
): string {
  return t(`dailyStatus.feedback_${value}`);
}
