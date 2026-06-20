// src/app/[locale]/(protected)/u/[username]/friends/(hooks)/use-friends.ts
"use client";

import {
  FriendOverride,
  FriendUser,
  FriendsData,
  UseFriendsOptions,
} from "@/types/app-types";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function useFriends({
  username,
  isLocked,
  onUpdate,
}: UseFriendsOptions) {
  const [overrides, setOverrides] = useState<Record<string, FriendOverride>>(
    {},
  );
  const [sentThisSession, setSentThisSession] = useState<Set<string>>(
    new Set(),
  );
  const [stableFriends, setStableFriends] = useState<FriendUser[] | null>(null);

  const { data, isLoading, mutate } = useSWR<FriendsData>(
    !isLocked && username ? `/api/users/${username}/friend` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 15000,
      onSuccess: (result) => {
        // Lock friends list on first load only
        setStableFriends((prev) => prev ?? result.friends);

        // Resolve any pending overrides whose sentRequest has disappeared
        setOverrides((prev) => {
          const pendingUsernames = Object.entries(prev)
            .filter(([, state]) => state === "pending")
            .map(([u]) => u);

          if (pendingUsernames.length === 0) return prev;

          const stillPendingSet = new Set(
            result.sentRequests.map((r) => r.receiver.username),
          );

          let changed = false;
          const updated = { ...prev };

          for (const u of pendingUsernames) {
            if (!stillPendingSet.has(u)) {
              const isFriend = result.friends.some((f) => f.username === u);
              if (isFriend) {
                updated[u] = "accepted";
                setStableFriends((prevStable) => {
                  if (!prevStable) return prevStable;
                  const already = prevStable.some((f) => f.username === u);
                  if (already) return prevStable;
                  const newFriend = result.friends.find(
                    (f) => f.username === u,
                  );
                  return newFriend ? [...prevStable, newFriend] : prevStable;
                });
              } else {
                updated[u] = "removed";
              }
              changed = true;
            }
          }

          return changed ? updated : prev;
        });
      },
    },
  );

  // Action handlers

  const removeFriend = async (u: string) => {
    await fetch(`/api/users/${u}/friend`, { method: "DELETE" });
    setOverrides((prev) => ({ ...prev, [u]: "removed" }));
    onUpdate?.();
  };

  const reAddFriend = async (u: string) => {
    await fetch(`/api/users/${u}/friend`, { method: "POST" });
    setOverrides((prev) => ({ ...prev, [u]: "pending" }));
    setSentThisSession((prev) => new Set([...prev, u]));
  };

  const cancelFromFriendsList = async (u: string) => {
    await fetch(`/api/users/${u}/friend`, { method: "DELETE" });
    setOverrides((prev) => ({ ...prev, [u]: "removed" }));
    // No mutate - card stays in both tabs until page refresh
  };

  const cancelSentRequest = async (u: string) => {
    await fetch(`/api/users/${u}/friend`, { method: "DELETE" });
    setOverrides((prev) => ({ ...prev, [u]: "removed" }));
  };

  const respondToRequest = async (id: string, action: "ACCEPT" | "DECLINE") => {
    await fetch(`/api/users/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (action === "ACCEPT") {
      const accepted = data?.receivedRequests.find((r) => r.id === id);
      if (accepted) {
        setStableFriends((prev) => [...(prev ?? []), accepted.sender]);
      }
      onUpdate?.();
    }
    mutate();
  };

  const unblockUser = async (u: string) => {
    await fetch(`/api/users/${u}/block`, { method: "DELETE" });
    mutate(); // Refresh data to remove user from blocked list
    onUpdate?.();
  };

  // Derived counts

  const serverSentUsernames = new Set(
    data?.sentRequests.map((r) => r.receiver.username) ?? [],
  );

  const optimisticSent = (stableFriends ?? []).filter(
    (f) =>
      f.username &&
      sentThisSession.has(f.username) &&
      !serverSentUsernames.has(f.username),
  );

  const activeFriendsCount = (stableFriends ?? []).filter(
    (f) =>
      !f.username ||
      (overrides[f.username] !== "removed" &&
        overrides[f.username] !== "pending"),
  ).length;

  const pendingOptimisticCount = optimisticSent.filter(
    (f) => f.username && overrides[f.username] === "pending",
  ).length;

  const pendingServerCount = (data?.sentRequests ?? []).filter(
    (r) =>
      !r.receiver.username ||
      (overrides[r.receiver.username] !== "removed" &&
        overrides[r.receiver.username] !== "accepted"),
  ).length;

  const sentCount = pendingServerCount + pendingOptimisticCount;

  return {
    data,
    isLoading,
    mutate,
    overrides,
    stableFriends,
    optimisticSent,
    activeFriendsCount,
    sentCount,
    removeFriend,
    reAddFriend,
    cancelFromFriendsList,
    cancelSentRequest,
    respondToRequest,
    unblockUser,
  };
}
