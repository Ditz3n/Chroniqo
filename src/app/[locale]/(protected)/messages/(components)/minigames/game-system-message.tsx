// src/app/[locale]/(protected)/messages/(components)/minigames/game-system-message.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { ApiMinigame, GameType, UIMessage } from "@/types/app-types";
import { Gamepad2 } from "lucide-react";

const GAME_LABELS: Record<GameType, string> = {
  TIC_TAC_TOE: "minigames.tic_tac_toe",
  CONNECT_FOUR: "minigames.connect_four",
  KNUCKLEBONES: "minigames.knucklebones",
};

type GamePayload = {
  gameId?: string;
  gameType?: GameType;
  challengerUsername?: string;
  challengerName?: string;
  accepterUsername?: string;
  accepterName?: string;
  actorUsername?: string;
  actorName?: string;
  winnerUsername?: string | null;
};

function parsePayload(text: string): GamePayload {
  try {
    return JSON.parse(text) as GamePayload;
  } catch {
    return {};
  }
}

function buildEventText(
  messageType: string,
  payload: GamePayload,
  currentUserId: string,
  game: ApiMinigame | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const gameName = payload.gameType
    ? t(GAME_LABELS[payload.gameType] ?? payload.gameType)
    : t("minigames.label");

  switch (messageType) {
    case "GAME_CHALLENGE":
      // Use full name for in-chat display (sidebar preview uses username via resolveGameMessagePreview)
      return t("minigames.system_challenge", {
        username:
          payload.challengerName ?? payload.challengerUsername ?? "Someone",
        game: gameName,
      });
    case "GAME_ACCEPTED":
      return t("minigames.system_accepted", {
        username:
          payload.accepterName ?? payload.accepterUsername ?? "Opponent",
      });
    case "GAME_DECLINED":
      return t("minigames.system_declined", {
        username: payload.actorName ?? payload.actorUsername ?? "Opponent",
      });
    case "GAME_CANCELLED":
      return t("minigames.system_cancelled", {
        username: payload.actorName ?? payload.actorUsername ?? "A player",
      });
    case "GAME_WITHDRAWN":
      return t("minigames.system_withdrawn", {
        username: payload.actorName ?? payload.actorUsername ?? "A player",
      });
    case "GAME_WIN":
      if (!payload.winnerUsername)
        return t("minigames.system_finished", { game: gameName });
      if (game?.winnerId === currentUserId)
        return t("minigames.system_you_won", { game: gameName });
      return t("minigames.system_opponent_won", {
        username: `u/${payload.winnerUsername}`,
        game: gameName,
      });
    case "GAME_DRAW":
      return t("minigames.system_draw", { game: gameName });
    default:
      return t("minigames.system_event");
  }
}

interface GameSystemMessageProps {
  msg: UIMessage;
  /** The live game linked to this message (null if already completed/deleted) */
  game: ApiMinigame | null;
  currentUserId: string;
  onOpenInfoModal: (game: ApiMinigame) => void;
  onOpenPlayModal: (game: ApiMinigame) => void;
}

export function GameSystemMessage({
  msg,
  game,
  currentUserId,
  onOpenInfoModal,
  onOpenPlayModal,
}: GameSystemMessageProps) {
  const { t } = useTranslation();
  const payload = parsePayload(msg.text);
  const messageType = msg.messageType ?? "";
  const eventText = buildEventText(
    messageType,
    payload,
    currentUserId,
    game,
    t,
  );

  // Determine which action button to show
  const isMyTurn =
    game?.status === "ACTIVE" && game?.currentTurnId === currentUserId;
  const isPendingChallenged =
    game?.status === "PENDING" && game?.player2Id === currentUserId;
  const isPendingChallenger =
    game?.status === "PENDING" && game?.player1Id === currentUserId;
  const isActive = game?.status === "ACTIVE";

  return (
    <div className="flex flex-col items-center gap-2 my-3 w-full">
      {/* Event label */}
      <div className="flex items-center gap-1.5">
        <Gamepad2 className="h-3 w-3 text-foreground-40" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40 text-center">
          {eventText}
        </span>
      </div>

      {/* Action buttons - only shown on the message type that matches the
          current game state to prevent duplicate buttons across messages. */}
      {game &&
        ((game.status === "PENDING" && messageType === "GAME_CHALLENGE") ||
          (game.status === "ACTIVE" && messageType === "GAME_ACCEPTED")) && (
          <div className="flex items-center gap-2">
            {/* Challenger: view / cancel pending */}
            {isPendingChallenger && (
              <button
                type="button"
                onClick={() =>
                  // LIVE pending: re-open the board modal with the "waiting" overlay.
                  // ASYNC pending: open the info modal (they may wait days for acceptance).
                  game.mode === "LIVE"
                    ? onOpenPlayModal(game)
                    : onOpenInfoModal(game)
                }
                className="text-xs font-bold text-foreground-60 hover:text-foreground border border-surface-border bg-surface hover:bg-surface-hover px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                {t("minigames.btn_view_challenge")}
              </button>
            )}

            {/* Challenged: accept or decline */}
            {isPendingChallenged && (
              <button
                type="button"
                onClick={() => onOpenInfoModal(game)}
                className="text-xs font-bold text-white bg-brand hover:opacity-85 px-3 py-1.5 rounded-full transition-opacity cursor-pointer"
              >
                {t("minigames.btn_respond_challenge")}
              </button>
            )}

            {/* Active - my turn */}
            {isActive && isMyTurn && (
              <button
                type="button"
                onClick={() => onOpenPlayModal(game)}
                className="text-xs font-bold text-white bg-brand hover:opacity-85 px-3 py-1.5 rounded-full transition-opacity cursor-pointer animate-pulse"
              >
                {t("minigames.btn_take_turn")}
              </button>
            )}

            {/* Active - their turn.
              LIVE games open the play modal (shows board with "waiting" indicator).
              ASYNC games open the info modal (shows "you'll be notified" message). */}
            {isActive && !isMyTurn && (
              <button
                type="button"
                onClick={() =>
                  game.mode === "LIVE"
                    ? onOpenPlayModal(game)
                    : onOpenInfoModal(game)
                }
                className="text-xs font-bold text-foreground-60 border border-surface-border bg-surface px-3 py-1.5 rounded-full cursor-pointer hover:bg-surface-hover transition-colors"
              >
                {t("minigames.btn_view_game")}
              </button>
            )}
          </div>
        )}
    </div>
  );
}
