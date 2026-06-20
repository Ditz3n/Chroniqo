// src/app/[locale]/(protected)/messages/(components)/minigames/tic-tac-toe.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ticTacToeSounds } from "@/lib/utils/game-sounds";
import { ApiMinigame, TicTacToeState } from "@/types/app-types";
import { Frown, Handshake, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Win detection (mirrors server logic; client-only for UI highlighting)

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

function getWinLine(board: (string | null)[]): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

// Sub-components

function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={cn("w-10 h-10", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
    >
      <line x1="8" y1="8" x2="36" y2="36" />
      <line x1="36" y1="8" x2="8" y2="36" />
    </svg>
  );
}

function OMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={cn("w-10 h-10", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
    >
      <circle cx="22" cy="22" r="14" />
    </svg>
  );
}

// Main component

interface TicTacToeProps {
  game: ApiMinigame;
  currentUserId: string;
  /** The currently selected (not yet confirmed) cell index - managed by parent. */
  selectedCell: number | null;
  onSelectCell: (cellIndex: number | null) => void;
  /** True when the current user clicked Forfeit - distinguishes self-forfeit from opponent forfeit. */
  selfForfeited?: boolean;
}

export function TicTacToe({
  game,
  currentUserId,
  selectedCell,
  onSelectCell,
  selfForfeited = false,
}: TicTacToeProps) {
  const { t } = useTranslation();
  const state = game.state as TicTacToeState;
  const board = state.board;

  const isPlayer1 = game.player1Id === currentUserId;
  const mySlot = isPlayer1 ? "PLAYER1" : "PLAYER2";
  const isMyTurn =
    game.currentTurnId === currentUserId && game.status === "ACTIVE";
  const isDone =
    game.status === "COMPLETED" ||
    game.status === "CANCELLED" ||
    game.status === "DECLINED";

  const winLine = getWinLine(board);

  const [hoverCell, setHoverCell] = useState<number | null>(null);

  // End-game animation: idle → highlighting (win cells blink) → fading → result
  const [animPhase, setAnimPhase] = useState<
    "idle" | "highlighting" | "fading" | "result"
  >("idle");
  const animTriggeredRef = useRef(false);

  // Play sound when it becomes our turn (board changed and we're next)
  const prevBoardRef = useRef<(string | null)[]>([]);
  useEffect(() => {
    const prev = prevBoardRef.current;
    if (
      prev.length > 0 &&
      JSON.stringify(prev) !== JSON.stringify(board) &&
      isMyTurn
    ) {
      ticTacToeSounds.opponentPlace();
    }
    prevBoardRef.current = board;
  }, [board, isMyTurn]);

  // Play win/draw sounds when game ends
  const prevStatusRef = useRef(game.status);
  useEffect(() => {
    if (prevStatusRef.current === game.status) return;
    prevStatusRef.current = game.status;
    if (game.status !== "COMPLETED" && game.status !== "CANCELLED") return;
    if (game.status === "CANCELLED" && game.winnerId === null) return; // Prevent sound on pending cancellation
    if (game.isDraw) {
      ticTacToeSounds.draw();
    } else if (game.winnerId === currentUserId) {
      ticTacToeSounds.win();
    } else if (game.winnerId) {
      // Current user lost (includes forfeit loss)
      ticTacToeSounds.lose();
    }
  }, [game.status, game.isDraw, game.winnerId, currentUserId]);

  // One-shot animation sequence triggered when any terminal state is reached
  useEffect(() => {
    const ended =
      game.status === "COMPLETED" ||
      game.status === "CANCELLED" ||
      game.status === "DECLINED";
    if (!ended || animTriggeredRef.current) return;
    animTriggeredRef.current = true;

    const currentWinLine = getWinLine(board);
    const skipHighlight =
      game.isDraw || game.status !== "COMPLETED" || !currentWinLine;

    if (skipHighlight) {
      const timers = [
        setTimeout(() => setAnimPhase("fading"), 200),
        setTimeout(() => setAnimPhase("result"), 700),
      ];
      return () => timers.forEach(clearTimeout);
    }

    // Win: highlight for ~1.8 s → fade → result overlay
    setAnimPhase("highlighting");
    const timers = [
      setTimeout(() => setAnimPhase("fading"), 1800),
      setTimeout(() => setAnimPhase("result"), 2300),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.isDraw]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null || isDone) return;
    ticTacToeSounds.place();
    // Toggle: clicking the already-selected cell deselects it
    onSelectCell(selectedCell === index ? null : index);
  };

  const p1User = game.player1;
  const p2User = game.player2;

  // Status text shown above the board
  const statusText = (() => {
    if (game.status === "PENDING") return t("minigames.status_pending");
    if (isDone) {
      if (game.status === "CANCELLED" || game.status === "DECLINED") return "";
      if (game.isDraw) return t("minigames.status_draw");
      if (game.winnerId === currentUserId) return t("minigames.status_you_won");
      if (game.winnerId)
        return t("minigames.status_opponent_won", {
          username: game.winner?.username
            ? `u/${game.winner.username}`
            : "Opponent",
        });
      return "";
    }
    if (isMyTurn) return t("minigames.status_your_turn_click");
    return t("minigames.status_waiting");
  })();

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Status - hidden once the result overlay is active */}
      {animPhase !== "result" && (
        <p
          className={cn(
            "text-sm font-bold text-center transition-colors",
            isMyTurn && !isDone ? "text-brand" : "text-foreground-60",
          )}
        >
          {statusText}
        </p>
      )}

      {/* Board + end-game overlay */}
      <div className="relative">
        {/* Grid fades out when the result overlay takes over */}
        <div
          className={cn(
            "grid grid-cols-3 gap-2.5 transition-opacity duration-500",
            (animPhase === "fading" || animPhase === "result") && "opacity-0",
          )}
        >
          {board.map((cell, i) => {
            const isWinCell = winLine?.includes(i) ?? false;
            const canInteract = isMyTurn && !cell && !isDone;
            const showGhost =
              canInteract && hoverCell === i && selectedCell !== i;
            const isHighlighting = animPhase === "highlighting";
            const isDimmed = isHighlighting && !isWinCell;
            const isPulsing = isHighlighting && isWinCell;

            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                onMouseEnter={() => canInteract && setHoverCell(i)}
                onMouseLeave={() => setHoverCell(null)}
                disabled={!canInteract}
                aria-label={`Cell ${i + 1}`}
                className={cn(
                  "w-[76px] h-[76px] rounded-2xl border-2 flex items-center justify-center transition-all duration-150 select-none",
                  isWinCell
                    ? "border-feedback-success bg-feedback-success/15"
                    : selectedCell === i && !cell
                      ? "border-brand bg-brand/10"
                      : "border-surface-border bg-surface",
                  canInteract &&
                    !cell &&
                    "hover:border-brand/50 hover:bg-surface-hover cursor-pointer active:scale-95",
                  !canInteract && !cell && "cursor-default",
                  isDimmed && "opacity-20 transition-opacity duration-300",
                  isPulsing &&
                    "animate-pulse border-feedback-success bg-feedback-success/30 scale-105",
                )}
              >
                {cell === "PLAYER1" ? (
                  <XMark
                    className={cn(
                      "text-brand transition-all duration-150",
                      isWinCell && "scale-110",
                    )}
                  />
                ) : cell === "PLAYER2" ? (
                  <OMark
                    className={cn(
                      "text-[var(--color-dailystatus-full-energy)] transition-all duration-150",
                      isWinCell && "scale-110",
                    )}
                  />
                ) : selectedCell === i ? (
                  mySlot === "PLAYER1" ? (
                    <XMark className="text-brand/55" />
                  ) : (
                    <OMark className="text-[var(--color-dailystatus-full-energy)]/55" />
                  )
                ) : showGhost ? (
                  mySlot === "PLAYER1" ? (
                    <XMark className="text-brand/25" />
                  ) : (
                    <OMark className="text-[var(--color-dailystatus-full-energy)]/25" />
                  )
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Result overlay - fades in after grid fades out */}
        {animPhase === "result" && (
          <div className="absolute inset-0 flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-3 text-center">
              {game.status === "CANCELLED" || game.status === "DECLINED" ? (
                <>
                  {game.status === "DECLINED" ? (
                    <p className="text-sm font-semibold text-foreground-60 text-center">
                      {t("minigames.over_declined")}
                    </p>
                  ) : game.winnerId === null ? (
                    <p className="text-sm font-semibold text-foreground-60 text-center">
                      {t("minigames.over_cancelled")}
                    </p>
                  ) : selfForfeited ? (
                    <>
                      <Frown className="h-10 w-10 text-brand mx-auto" />
                      <p className="text-xl font-black text-foreground">
                        {t("minigames.status_you_lose")}
                      </p>
                      <p className="text-sm font-semibold text-foreground-60 text-center">
                        {t("minigames.over_you_forfeited")}
                      </p>
                    </>
                  ) : (
                    // Opponent forfeited → I win
                    <>
                      <Trophy className="h-10 w-10 text-brand" />
                      <p className="text-xl font-black text-foreground">
                        {t("minigames.status_you_won")}
                      </p>
                      <p className="text-sm text-foreground-60">
                        {t("minigames.over_forfeit_by", {
                          username: `u/${(isPlayer1 ? game.player2 : game.player1).username ?? "Opponent"}`,
                        })}
                      </p>
                    </>
                  )}
                </>
              ) : game.isDraw ? (
                <>
                  <Handshake className="h-10 w-10 text-brand mx-auto" />
                  <p className="text-xl font-black text-foreground">
                    {t("minigames.status_draw")}
                  </p>
                  <p className="text-sm font-semibold text-foreground-60 text-center">
                    {t("minigames.over_draw_subtitle")}
                  </p>
                </>
              ) : game.winnerId === currentUserId ? (
                <>
                  <Trophy className="h-10 w-10 text-brand" />
                  <p className="text-xl font-black text-foreground">
                    {t("minigames.status_you_won")}
                  </p>
                </>
              ) : (
                <p className="text-xl font-black text-foreground">
                  {t("minigames.status_opponent_won", {
                    username: game.winner?.username
                      ? `u/${game.winner.username}`
                      : "Opponent",
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend - hidden once result overlay is showing */}
      {animPhase !== "result" && (
        <div className="flex items-center gap-6 text-xs font-medium text-foreground-60">
          <div className="flex items-center gap-2">
            <XMark className="text-brand w-4 h-4" />
            <span>
              {isPlayer1
                ? t("minigames.legend_you")
                : p1User.username
                  ? `u/${p1User.username}`
                  : (p1User.name ?? t("minigames.legend_player1"))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <OMark className="text-[var(--color-dailystatus-full-energy)] w-4 h-4" />
            <span>
              {!isPlayer1
                ? t("minigames.legend_you")
                : p2User.username
                  ? `u/${p2User.username}`
                  : (p2User.name ?? t("minigames.legend_player2"))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
