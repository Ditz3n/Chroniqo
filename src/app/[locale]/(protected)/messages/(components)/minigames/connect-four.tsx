// src/app/[locale]/(protected)/messages/(components)/minigames/connect-four.tsx
"use client";

import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { connectFourSounds } from "@/lib/utils/game-sounds";
import { ApiMinigame, ConnectFourState } from "@/types/app-types";
import { Frown, Handshake, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const COLS = 7;
const ROWS = 6;

// Win detection (UI-only - mirrors server logic)

type WinCell = { col: number; row: number };

function getWinCells(board: (string | null)[][]): WinCell[] | null {
  // Horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col + 1][row] &&
        cell === board[col + 2][row] &&
        cell === board[col + 3][row]
      ) {
        return [
          { col, row },
          { col: col + 1, row },
          { col: col + 2, row },
          { col: col + 3, row },
        ];
      }
    }
  }
  // Vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col][row + 1] &&
        cell === board[col][row + 2] &&
        cell === board[col][row + 3]
      ) {
        return [
          { col, row },
          { col, row: row + 1 },
          { col, row: row + 2 },
          { col, row: row + 3 },
        ];
      }
    }
  }
  // Diagonal ↗
  for (let col = 0; col <= COLS - 4; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col + 1][row + 1] &&
        cell === board[col + 2][row + 2] &&
        cell === board[col + 3][row + 3]
      ) {
        return [
          { col, row },
          { col: col + 1, row: row + 1 },
          { col: col + 2, row: row + 2 },
          { col: col + 3, row: row + 3 },
        ];
      }
    }
  }
  // Diagonal ↘
  for (let col = 0; col <= COLS - 4; col++) {
    for (let row = 3; row < ROWS; row++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col + 1][row - 1] &&
        cell === board[col + 2][row - 2] &&
        cell === board[col + 3][row - 3]
      ) {
        return [
          { col, row },
          { col: col + 1, row: row - 1 },
          { col: col + 2, row: row - 2 },
          { col: col + 3, row: row - 3 },
        ];
      }
    }
  }
  return null;
}

// Disc component

function Disc({
  slot,
  isWin = false,
  isGhost = false,
  isDropping = false,
}: {
  slot: "PLAYER1" | "PLAYER2" | null;
  isWin?: boolean;
  isGhost?: boolean;
  isDropping?: boolean;
}) {
  const base =
    "w-full h-full rounded-full transition-all duration-200 border-2";

  if (!slot)
    return <div className={cn(base, "border-transparent bg-transparent")} />;

  const color =
    slot === "PLAYER1"
      ? isWin
        ? "bg-brand border-brand/80 shadow-[0_0_12px_3px] shadow-brand/40 scale-110"
        : isGhost
          ? "bg-brand/20 border-brand/30"
          : "bg-brand border-brand/70 shadow-sm"
      : isWin
        ? "bg-[var(--color-dailystatus-full-energy)] border-[var(--color-dailystatus-full-energy)]/80 shadow-[0_0_12px_3px] shadow-[var(--color-dailystatus-full-energy)]/40 scale-110"
        : isGhost
          ? "bg-[var(--color-dailystatus-full-energy)]/20 border-[var(--color-dailystatus-full-energy)]/30"
          : "bg-[var(--color-dailystatus-full-energy)] border-[var(--color-dailystatus-full-energy)]/70 shadow-sm";

  return (
    <div
      className={cn(
        base,
        color,
        isDropping && "animate-[connect-four-drop_0.25s_ease-in_both]",
      )}
    />
  );
}

// Main component

interface ConnectFourProps {
  game: ApiMinigame;
  currentUserId: string;
  selectedColumn: number | null;
  onSelectColumn: (column: number | null) => void;
  selfForfeited?: boolean;
}

export function ConnectFour({
  game,
  currentUserId,
  selectedColumn,
  onSelectColumn,
  selfForfeited = false,
}: ConnectFourProps) {
  const { t } = useTranslation();
  const state = game.state as ConnectFourState;
  const board = state.board; // board[col][row], row 0 = bottom

  const isPlayer1 = game.player1Id === currentUserId;
  const mySlot: "PLAYER1" | "PLAYER2" = isPlayer1 ? "PLAYER1" : "PLAYER2";
  const isMyTurn =
    game.currentTurnId === currentUserId && game.status === "ACTIVE";
  const isDone =
    game.status === "COMPLETED" ||
    game.status === "CANCELLED" ||
    game.status === "DECLINED";

  const winCells = getWinCells(board);

  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // End-game animation phases
  const [animPhase, setAnimPhase] = useState<
    "idle" | "highlighting" | "fading" | "result"
  >("idle");
  const animTriggeredRef = useRef(false);

  // Sound when opponent places a disc
  const prevBoardRef = useRef<(string | null)[][]>([]);
  useEffect(() => {
    const prev = prevBoardRef.current;
    if (
      prev.length > 0 &&
      JSON.stringify(prev) !== JSON.stringify(board) &&
      isMyTurn
    ) {
      connectFourSounds.drop();
    }
    prevBoardRef.current = board;
  }, [board, isMyTurn]);

  // Win/draw sounds (fires on COMPLETED or CANCELLED, handles forfeit win/loss)
  const prevStatusRef = useRef(game.status);
  useEffect(() => {
    if (prevStatusRef.current === game.status) return;
    prevStatusRef.current = game.status;
    if (game.status !== "COMPLETED" && game.status !== "CANCELLED") return;
    if (game.status === "CANCELLED" && game.winnerId === null) return; // Prevent sound on pending cancellation
    if (game.isDraw) {
      connectFourSounds.draw();
    } else if (game.winnerId === currentUserId) {
      connectFourSounds.win();
    } else if (game.winnerId) {
      // Current user lost (includes forfeit loss)
      connectFourSounds.lose();
    }
  }, [game.status, game.isDraw, game.winnerId, currentUserId]);

  const handleColumnClick = (col: number) => {
    if (!isMyTurn || isDone) return;
    if (board[col].every((cell) => cell !== null)) return;
    connectFourSounds.drop();
    onSelectColumn(selectedColumn === col ? null : col);
  };

  // One-shot animation sequence when game reaches a terminal state
  useEffect(() => {
    const ended =
      game.status === "COMPLETED" ||
      game.status === "CANCELLED" ||
      game.status === "DECLINED";
    if (!ended || animTriggeredRef.current) return;
    animTriggeredRef.current = true;

    const currentWinCells = getWinCells(board);
    const skipHighlight =
      game.isDraw || game.status !== "COMPLETED" || !currentWinCells;

    if (skipHighlight) {
      const timers = [
        setTimeout(() => setAnimPhase("fading"), 200),
        setTimeout(() => setAnimPhase("result"), 700),
      ];
      return () => timers.forEach(clearTimeout);
    }

    setAnimPhase("highlighting");
    const timers = [
      setTimeout(() => setAnimPhase("fading"), 1800),
      setTimeout(() => setAnimPhase("result"), 2300),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.isDraw]);

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
    if (isMyTurn) return t("minigames.status_your_turn_click_col");
    return t("minigames.status_waiting");
  })();

  // Determine the landing row for the ghost disc in the hover column
  const ghostRow =
    hoverCol !== null ? board[hoverCol].findIndex((cell) => cell === null) : -1;

  return (
    <div className="flex flex-col items-center gap-4">
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
      <div
        className="relative p-3 rounded-2xl bg-surface border border-surface-border"
        onMouseLeave={() => setHoverCol(null)}
      >
        {/* Column click zones + drop indicator */}
        <div
          className="grid mb-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "6px" }}
        >
          {Array.from({ length: COLS }).map((_, col) => {
            const colFull = board[col].every((cell) => cell !== null);
            const canDrop = isMyTurn && !colFull && !isDone;
            return (
              <div
                key={col}
                className={cn(
                  "h-4 flex items-center justify-center rounded-full transition-all",
                  canDrop && hoverCol === col
                    ? mySlot === "PLAYER1"
                      ? "bg-brand/30"
                      : "bg-[var(--color-dailystatus-full-energy)]/30"
                    : "bg-transparent",
                )}
                style={{ width: 40 }}
              >
                {canDrop && hoverCol === col && (
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      mySlot === "PLAYER1"
                        ? "bg-brand"
                        : "bg-[var(--color-dailystatus-full-energy)]",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Grid (rendered top-to-bottom, row 5 = top visually) */}
        <div
          className={cn(
            "grid transition-opacity duration-500",
            (animPhase === "fading" || animPhase === "result") && "opacity-0",
          )}
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "6px",
          }}
        >
          {Array.from({ length: ROWS })
            .map((_, visualRow) => ROWS - 1 - visualRow) // invert so row 0 (bottom) is at the bottom
            .flatMap((row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const cell = board[col][row] as "PLAYER1" | "PLAYER2" | null;
                const isWinCell =
                  winCells?.some((c) => c.col === col && c.row === row) ??
                  false;
                const isDropping = false;
                const isGhostCell =
                  isMyTurn &&
                  !isDone &&
                  !cell &&
                  col === hoverCol &&
                  row === ghostRow;
                const canDrop =
                  isMyTurn && !isDone && board[col].some((c) => c === null);
                // Dim filled non-win cells during the highlighting phase
                const isDimmedCell =
                  animPhase === "highlighting" && !!cell && !isWinCell;

                return (
                  <div
                    key={`${col}-${row}`}
                    onClick={() => handleColumnClick(col)}
                    onMouseEnter={() => canDrop && setHoverCol(col)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      "bg-background/40 border border-surface-border/50",
                      canDrop ? "cursor-pointer" : "cursor-default",
                      isDimmedCell &&
                        "opacity-20 transition-opacity duration-300",
                    )}
                  >
                    <Disc
                      slot={
                        !cell &&
                        selectedColumn === col &&
                        row === board[col].findIndex((c) => c === null)
                          ? mySlot
                          : isGhostCell
                            ? mySlot
                            : cell
                      }
                      isWin={isWinCell}
                      isGhost={
                        isGhostCell &&
                        !(
                          !cell &&
                          selectedColumn === col &&
                          row === board[col].findIndex((c) => c === null)
                        )
                      }
                      isDropping={isDropping}
                    />
                  </div>
                );
              }),
            )}
        </div>
      </div>

      {/* Result overlay */}
      {animPhase === "result" && (
        <div className="absolute inset-0 flex items-center justify-center animate-in fade-in duration-300 rounded-2xl">
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
                  username: game.winner?.username ?? "Opponent",
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {animPhase !== "result" && (
        <div className="flex items-center gap-6 text-xs font-medium text-foreground-60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-brand border-2 border-brand/70 shadow-sm" />
            <span>
              {isPlayer1
                ? t("minigames.legend_you")
                : game.player1.username
                  ? `u/${game.player1.username}`
                  : (game.player1.name ?? t("minigames.legend_player1"))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[var(--color-dailystatus-full-energy)] border-2 border-[var(--color-dailystatus-full-energy)]/70 shadow-sm" />
            <span>
              {!isPlayer1
                ? t("minigames.legend_you")
                : game.player2.username
                  ? `u/${game.player2.username}`
                  : (game.player2.name ?? t("minigames.legend_player2"))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
