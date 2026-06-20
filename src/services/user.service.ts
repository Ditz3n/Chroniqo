// src/services/user.service.ts
import { prisma } from "@/lib/prisma";

/**
 * Determines whether a viewer is permitted to see the daily status (mood ring)
 * of a target user, enforcing the profile privacy setting.
 *
 * Rules (in priority order):
 *   1. Viewer IS the target -> always visible (own status is always shown)
 *   2. Target has a public profile -> visible to all authenticated users
 *   3. Target has a private profile -> visible only to confirmed friends
 */
export function canViewDailyStatus(
  viewerId: string,
  target: { id: string; isPrivate: boolean },
  friendIds: Set<string>,
): boolean {
  if (viewerId === target.id) return true;
  if (!target.isPrivate) return true;
  return friendIds.has(target.id);
}

export async function getQuickReactions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quickReactions: true },
  });

  return user?.quickReactions || ["❤️", "😂", "😮", "😢", "😡", "👍"];
}

export async function updateQuickReactions(userId: string, emojis: string[]) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { quickReactions: emojis },
    select: { quickReactions: true },
  });

  return updatedUser.quickReactions;
}
