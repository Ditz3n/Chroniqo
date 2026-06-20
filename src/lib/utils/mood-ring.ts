// src/lib/utils/mood-ring.ts
import { DAILY_STATUSES } from "@/lib/constants";

/** Gray token shown when no daily status has been registered today. */
export const MOOD_RING_FALLBACK = "var(--surface-border)";

/**
 * Returns midnight UTC for today. Used to scope daily-status Prisma queries
 * to the current calendar day only, preventing yesterday's status from
 * persisting in mood ring displays.
 */
export function getTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolves the ring color for a given daily status value.
 * Returns the gray fallback token when value is absent - i.e. the user
 * has not registered a status today.
 */
export function getMoodRingColor(value?: number | null): string {
  if (value == null) return MOOD_RING_FALLBACK;
  return DAILY_STATUSES[value]?.color ?? MOOD_RING_FALLBACK;
}
