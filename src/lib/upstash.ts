// src/lib/upstash.ts
import { BAN_FLAG_TTL_SECONDS } from "@/lib/constants";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

// 20 requests per user per hour limiter for Niqo/Gemini endpoints
export const rateLimiterPerHour = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
  prefix: "@upstash/ratelimit/gemini",
});

// Called when an admin bans a user - signals active sessions to sign out.
export async function setBanFlag(userId: string): Promise<void> {
  await redis.set(`banned:${userId}`, "1", { ex: BAN_FLAG_TTL_SECONDS });
}

// Called when an admin revokes a ban - prevents already-logged-in users from being signed out.
export async function clearBanFlag(userId: string): Promise<void> {
  await redis.del(`banned:${userId}`);
}
