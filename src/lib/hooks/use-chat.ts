// src/lib/hooks/use-chat.ts
"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function useConversations() {
  // Poll conversations every 10 seconds
  return useSWR("/api/conversations", fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });
}

export function useMessages(conversationId: string | null) {
  // Poll messages every 3 seconds for near real-time feel
  return useSWR(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );
}

export function useQuickReactions() {
  return useSWR("/api/user/quick-reactions", fetcher, {
    revalidateOnFocus: false, // Preferences rarely change externally
  });
}

export function useNotesCarousel() {
  return useSWR("/api/daily-status/carousel", fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
  });
}

export function useTodayStatus() {
  return useSWR("/api/daily-status/today", fetcher, {
    revalidateOnFocus: true,
  });
}

export async function markChatAsRead(conversationId: string) {
  try {
    await fetch(`/api/conversations/${conversationId}/read`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to mark chat as read", err);
  }
}

export async function toggleChatMute(conversationId: string, isMuted: boolean) {
  try {
    await fetch(`/api/conversations/${conversationId}/mute`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMuted }),
    });
  } catch (err) {
    console.error("Failed to toggle chat mute", err);
  }
}

/** Poll an individual game's state. Interval drops to 1.5 s in LIVE mode. */
export function useMinigame(
  gameId: string | null,
  mode: "ASYNC" | "LIVE" = "ASYNC",
) {
  return useSWR(gameId ? `/api/minigames/${gameId}` : null, fetcher, {
    refreshInterval: mode === "LIVE" ? 1500 : 5000,
    revalidateOnFocus: true,
  });
}

/** List PENDING + ACTIVE games for a conversation (used by sidebar + message rendering). */
export function useConversationMinigames(conversationId: string | null) {
  return useSWR(
    conversationId ? `/api/conversations/${conversationId}/minigames` : null,
    fetcher,
    {
      refreshInterval: 3000, // same cadence as messages
      revalidateOnFocus: true,
    },
  );
}
