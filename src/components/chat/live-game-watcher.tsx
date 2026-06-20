// src/components/chat/live-game-watcher.tsx
"use client";

import { GameHistoryModal } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-history-modal";
import { GameInfoModal } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-info-modal";
import { GamePlayModal } from "@/app/[locale]/(protected)/messages/(components)/minigames/game-play-modal";
import { ApiMinigame, GameType } from "@/types/app-types";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

interface LiveData {
  invitations: ApiMinigame[];
  activeTurns: ApiMinigame[];
}

/**
 * Renders at the protected layout level. Polls for:
 *   1. LIVE game invitations (player2) → shows GameInfoModal
 *   2. LIVE active turns (player1 notified when game starts) → shows GamePlayModal
 *
 * Suppressed when the user's daily status value is ≤ 1 (exhausted / low energy)
 * to respect the platform's low-energy mode promise.
 */
export function LiveGameWatcher() {
  const { data: session } = useSession();
  const { mutate: globalMutate } = useSWRConfig();

  // Check today's dagsform to decide whether to show popup notifications
  const { data: statusData } = useSWR(
    session?.user?.id ? "/api/daily-status/today" : null,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const dailyValue: number | null = statusData?.dailyStatus?.value ?? null;
  // Suppress live popups for the two lowest energy levels (0 = exhausted, 1 = low)
  const suppressPopup = dailyValue !== null && dailyValue <= 1;

  // Persist dismissed IDs in sessionStorage so refreshes don't re-show the same invitation.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = sessionStorage.getItem("chroniqo_dismissed_game_invites");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  // Track the game to show in the play modal after player2 accepts
  const [acceptedGame, _setAcceptedGame] = useState<ApiMinigame | null>(null);
  // Persisted live game for player1 - stays mounted after the move passes
  // the turn to opponent (game leaves activeTurns but modal must remain open)
  const [liveActiveGame, _setLiveActiveGame] = useState<ApiMinigame | null>(
    null,
  );
  const [historyModal, setHistoryModal] = useState<{
    opponentId: string;
    opponentUsername: string;
  } | null>(null);

  // True when a game modal from another component (chat-view, mini-chat-view) is open.
  // Prevents the live invitation from appearing on top of an ongoing game end-screen.
  const [hasExternalDialog, setHasExternalDialog] = useState(false);
  const ownDialogCount = useRef(0);

  useEffect(() => {
    const update = () => {
      const total = document.querySelectorAll('[role="dialog"]').length;
      setHasExternalDialog(total > ownDialogCount.current);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, []);

  // Refs that mirror state values so onSuccess always sees fresh values
  const acceptedGameRef = useRef<ApiMinigame | null>(null);
  const liveActiveGameRef = useRef<ApiMinigame | null>(null);
  const latchedTurnIds = useRef<Set<string>>(
    typeof window !== "undefined"
      ? (() => {
          try {
            const stored = sessionStorage.getItem("chroniqo_latched_turn_ids");
            return stored
              ? new Set(JSON.parse(stored) as string[])
              : new Set<string>();
          } catch {
            return new Set<string>();
          }
        })()
      : new Set<string>(),
  );

  const latchTurn = useCallback((id: string) => {
    latchedTurnIds.current.add(id);
    try {
      sessionStorage.setItem(
        "chroniqo_latched_turn_ids",
        JSON.stringify([...latchedTurnIds.current]),
      );
    } catch {}
  }, []);

  const setAcceptedGame = useCallback((g: ApiMinigame | null) => {
    acceptedGameRef.current = g;
    _setAcceptedGame(g);
  }, []);

  const setLiveActiveGame = useCallback((g: ApiMinigame | null) => {
    liveActiveGameRef.current = g;
    _setLiveActiveGame(g);
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set([...prev, id]);
      try {
        sessionStorage.setItem(
          "chroniqo_dismissed_game_invites",
          JSON.stringify([...next]),
        );
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const invalidateConversations = useCallback(() => {
    globalMutate(
      (key) => typeof key === "string" && key.includes("/api/conversations"),
    );
  }, [globalMutate]);

  // Poll live invitations and active turns
  const { data } = useSWR<LiveData>(
    session?.user?.id && !suppressPopup
      ? "/api/minigames/live-invitations"
      : null,
    fetcher,
    {
      refreshInterval: 3_000,
      onSuccess: (newData) => {
        // Read the DOM directly so we never act on stale React state.
        const dialogCount = document.querySelectorAll('[role="dialog"]').length;
        const externalDialogOpen = dialogCount > ownDialogCount.current;

        const unseenTurns =
          newData?.activeTurns?.filter(
            (g) => !latchedTurnIds.current.has(g.id),
          ) ?? [];

        // Always latch every unseen turn we observe - even when we skip opening
        // a modal. This prevents the same turn from re-surfacing on the next
        // poll (issue 2) or after a page refresh (issue 4).
        if (unseenTurns.length > 0) {
          unseenTurns.forEach((g) => latchedTurnIds.current.add(g.id));
          try {
            sessionStorage.setItem(
              "chroniqo_latched_turn_ids",
              JSON.stringify([...latchedTurnIds.current]),
            );
          } catch {
            /* storage unavailable */
          }
        }

        if (
          acceptedGameRef.current ||
          liveActiveGameRef.current ||
          externalDialogOpen ||
          unseenTurns.length === 0
        )
          return;

        setLiveActiveGame(unseenTurns[0]);
      },
    },
  );

  // First undismissed pending invitation
  const pendingInvitation = data?.invitations?.find(
    (g) => !dismissedIds.has(g.id),
  );

  const showPending =
    !!pendingInvitation && !acceptedGame && !historyModal && !hasExternalDialog;

  useEffect(() => {
    ownDialogCount.current =
      (acceptedGame ? 1 : 0) +
      (liveActiveGame ? 1 : 0) +
      (historyModal ? 1 : 0) +
      (showPending ? 1 : 0);
  }, [acceptedGame, liveActiveGame, historyModal, showPending]);

  if (!session?.user?.id) return null;

  return (
    <>
      {/* Player2: incoming LIVE challenge */}
      {pendingInvitation &&
        !acceptedGame &&
        !historyModal &&
        !hasExternalDialog && (
          <GameInfoModal
            isOpen
            onClose={() => dismiss(pendingInvitation.id)}
            gameType={pendingInvitation.type as GameType}
            currentUserId={session.user.id}
            game={pendingInvitation}
            opponentId={pendingInvitation.player1Id}
            opponentUsername={pendingInvitation.player1.username ?? ""}
            conversationId={pendingInvitation.conversationId ?? ""}
            onAccepted={(game) => {
              dismiss(pendingInvitation.id);
              dismiss(game.id);
              latchTurn(game.id); // Ensure poll ignores this game so it doesn't reopen on close
              setAcceptedGame(game);
              invalidateConversations();
            }}
            onDeclined={() => {
              dismiss(pendingInvitation.id);
              invalidateConversations();
            }}
            onCancelled={() => dismiss(pendingInvitation.id)}
            onOpenHistory={() => {
              setHistoryModal({
                opponentId: pendingInvitation.player1Id,
                opponentUsername: pendingInvitation.player1.username ?? "",
              });
            }}
          />
        )}

      {historyModal && (
        <GameHistoryModal
          isOpen={!!historyModal}
          onClose={() => setHistoryModal(null)}
          opponentId={historyModal.opponentId}
          opponentUsername={historyModal.opponentUsername}
          currentUserId={session.user.id}
        />
      )}

      {/* Player1: LIVE game - kept alive until user explicitly closes */}
      {liveActiveGame && (
        <GamePlayModal
          isOpen
          onClose={() => {
            setLiveActiveGame(null);
            invalidateConversations();
          }}
          initialGame={liveActiveGame}
          onMoveComplete={invalidateConversations}
        />
      )}

      {/* Play modal opened after player2 accepts */}
      {acceptedGame && (
        <GamePlayModal
          isOpen
          onClose={() => {
            setAcceptedGame(null);
            invalidateConversations();
          }}
          initialGame={acceptedGame}
          onMoveComplete={invalidateConversations}
        />
      )}
    </>
  );
}
