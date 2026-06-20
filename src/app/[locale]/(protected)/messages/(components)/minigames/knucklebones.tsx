// src/app/[locale]/(protected)/messages/(components)/minigames/knucklebones.tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconAvatar,
} from "@/components/ui/avatar";
import { useTranslation } from "@/lib/hooks/use-translation";
import { cn } from "@/lib/utils";
import { knuckleBonesSounds } from "@/lib/utils/game-sounds";
import {
  ApiMinigame,
  ApiMinigamePlayer,
  KnuckleBonesState,
} from "@/types/app-types";
import { Frown, Music, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Pure helpers

function calcColScore(col: (number | null)[]): number {
  const dice = col.filter((v): v is number => v !== null);
  const groups = new Map<number, number>();
  dice.forEach((v) => groups.set(v, (groups.get(v) ?? 0) + 1));
  let score = 0;
  groups.forEach((count, value) => (score += count * count * value));
  return score;
}

function calcTotalScore(grid: (number | null)[][]): number {
  return grid.reduce((sum, col) => sum + calcColScore(col), 0);
}

/** Returns how many dice of `value` exist in `col` (used for pair/triple coloring). */
function getValueCount(col: (number | null)[], value: number): number {
  return col.filter((v) => v === value).length;
}

// Die face (SVG dots)

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 25],
    [72, 25],
    [28, 50],
    [72, 50],
    [28, 75],
    [72, 75],
  ],
};

function DieFace({
  value,
  className,
  dotClassName,
  bgColor,
}: {
  value: number;
  className?: string;
  dotClassName?: string;
  bgColor?: string;
}) {
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("w-full h-full", className)}
      aria-label={`Die showing ${value}`}
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="18"
        style={{ fill: bgColor ?? "var(--foreground)" }}
      />
      {dots.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="9"
          className={dotClassName ?? "fill-background"}
        />
      ))}
    </svg>
  );
}

// Grid cell (with pair/triple coloring)

function GridCell({
  value,
  colValues,
  isSelectedSlot,
  pendingValue,
  isClickable,
  isDestroying,
  onClick,
}: {
  value: number | null;
  colValues: (number | null)[];
  isSelectedSlot?: boolean;
  pendingValue?: number | null;
  isClickable?: boolean;
  isDestroying?: boolean;
  onClick?: () => void;
}) {
  const multiplier = value !== null ? getValueCount(colValues, value) : 0;
  const isPair = multiplier === 2;
  const isTriple = multiplier === 3;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      style={{
        borderColor:
          isSelectedSlot && !value
            ? "var(--brand)"
            : isTriple
              ? "var(--color-dailystatus-full-energy)"
              : isPair
                ? "var(--color-dailystatus-good-periods)"
                : undefined,
      }}
      className={cn(
        "w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 flex items-center justify-center p-1.5 transition-all duration-150",
        isSelectedSlot && !value
          ? "bg-brand/10 scale-105"
          : value
            ? "bg-surface"
            : "border-surface-border bg-surface/50",
        isClickable &&
          !value &&
          "hover:border-brand/50 hover:bg-surface-hover cursor-pointer active:scale-95",
        !isClickable && "cursor-default",
      )}
    >
      {value ? (
        <div
          className={cn(
            "w-full h-full transition-all duration-500 ease-in-out",
            isDestroying
              ? "opacity-0 scale-50 rotate-12"
              : "opacity-100 scale-100",
          )}
        >
          <DieFace
            value={value}
            bgColor={
              isTriple
                ? "var(--color-dailystatus-full-energy)"
                : isPair
                  ? "var(--color-dailystatus-good-periods)"
                  : "var(--foreground)"
            }
            dotClassName="fill-background"
          />
        </div>
      ) : isSelectedSlot && pendingValue ? (
        <DieFace value={pendingValue} className="opacity-40" />
      ) : null}
    </button>
  );
}

// Player avatar (mini)

function PlayerAvatar({
  player,
  highlight,
}: {
  player: ApiMinigamePlayer;
  highlight: boolean;
}) {
  return (
    <Avatar
      className={cn(
        "h-9 w-9 border-2 flex-shrink-0",
        highlight ? "border-brand" : "border-surface-border",
      )}
    >
      {player.image && <AvatarImage src={player.image} />}
      {!player.image && player.avatarBgColor ? (
        <IconAvatar
          emoji={player.avatarEmoji}
          bgColor={player.avatarBgColor}
          emojiSizeClass="text-sm"
        />
      ) : (
        <AvatarFallback className="text-[10px] bg-surface font-bold text-foreground">
          {((player.username || player.name) ?? "?")[0].toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

// Main component

interface KnuckleBonesProps {
  game: ApiMinigame;
  currentUserId: string;
  selectedColumn: number | null;
  onSelectColumn: (col: number | null) => void;
  selfForfeited?: boolean;
  /**
   * When true, the board and dice are locked to a snapshot taken at the moment
   * frozen became true. Prevents the opponent's newly-rolled die from flashing
   * in while the "Move sent" overlay is animating.
   */
  frozen?: boolean;
}

export function KnuckleBones({
  game,
  currentUserId,
  selectedColumn,
  onSelectColumn,
  selfForfeited = false,
  frozen = false,
}: KnuckleBonesProps) {
  const { t } = useTranslation();
  const state = game.state as KnuckleBonesState;
  const isPlayer1 = game.player1Id === currentUserId;

  // Synchronously capture a board snapshot the moment frozen becomes true so
  // the opponent's newly-rolled die never appears while the success overlay
  // is still animating. Mutating refs during render is safe in React.
  const prevFrozenRef = useRef(false);
  const frozenTurnRef = useRef<string | null>(null);
  const frozenRollRef = useRef<number | null>(null);

  if (frozen && !prevFrozenRef.current) {
    frozenTurnRef.current = game.currentTurnId;
    frozenRollRef.current = state.pendingRoll;
  }
  if (!frozen) {
    frozenTurnRef.current = null;
    frozenRollRef.current = null;
  }
  prevFrozenRef.current = frozen;

  const displayTurnId = frozenTurnRef.current ?? game.currentTurnId;
  const displayRollVal = frozenRollRef.current ?? state.pendingRoll;

  // Always use the latest grid so the placed die is visible
  const myGrid = isPlayer1 ? state.player1Grid : state.player2Grid;
  const opponentGrid = isPlayer1 ? state.player2Grid : state.player1Grid;
  const myPlayer: ApiMinigamePlayer = isPlayer1 ? game.player1 : game.player2;
  const opponentPlayer: ApiMinigamePlayer = isPlayer1
    ? game.player2
    : game.player1;

  const isMyTurn = displayTurnId === currentUserId && game.status === "ACTIVE";
  const isDone = ["COMPLETED", "CANCELLED", "DECLINED"].includes(game.status);

  // Destruction & Placement animations and sounds
  // We use derived state to intercept the server grid updating during render.
  // If dice were destroyed, we freeze the UI on the old grid and trigger the CSS fade out,
  // then snap to the new grid after 500ms. This prevents the 1-frame flicker.
  const [prevServerMyGrid, setPrevServerMyGrid] = useState(myGrid);
  const [prevServerOppGrid, setPrevServerOppGrid] = useState(opponentGrid);
  const [animatingGrids, setAnimatingGrids] = useState<{
    my: (number | null)[][];
    opp: (number | null)[][];
    destroying: { isMine: boolean; col: number; val: number }[];
  } | null>(null);
  const [playPlaceSoundTrigger, setPlayPlaceSoundTrigger] = useState(0);

  if (
    JSON.stringify(myGrid) !== JSON.stringify(prevServerMyGrid) ||
    JSON.stringify(opponentGrid) !== JSON.stringify(prevServerOppGrid)
  ) {
    let hasDestruction = false;
    const destroying: { isMine: boolean; col: number; val: number }[] = [];

    for (let c = 0; c < 3; c++) {
      const prevMyCount = prevServerMyGrid[c].filter((v) => v !== null).length;
      const newMyCount = myGrid[c].filter((v) => v !== null).length;
      if (newMyCount < prevMyCount) {
        hasDestruction = true;
        const missing = prevServerMyGrid[c].find(
          (v) => v !== null && !myGrid[c].includes(v),
        );
        if (missing !== undefined && missing !== null)
          destroying.push({ isMine: true, col: c, val: missing });
      }

      const prevOppCount = prevServerOppGrid[c].filter(
        (v) => v !== null,
      ).length;
      const newOppCount = opponentGrid[c].filter((v) => v !== null).length;
      if (newOppCount < prevOppCount) {
        hasDestruction = true;
        const missing = prevServerOppGrid[c].find(
          (v) => v !== null && !opponentGrid[c].includes(v),
        );
        if (missing !== undefined && missing !== null)
          destroying.push({ isMine: false, col: c, val: missing });
      }
    }

    if (hasDestruction) {
      setAnimatingGrids({
        my: prevServerMyGrid,
        opp: prevServerOppGrid,
        destroying,
      });
    } else {
      const placed = myGrid.some((col, c) =>
        col.some((val, r) => prevServerMyGrid[c]?.[r] === null && val !== null),
      );
      if (placed && !isMyTurn) setPlayPlaceSoundTrigger((prev) => prev + 1);
    }

    setPrevServerMyGrid(myGrid);
    setPrevServerOppGrid(opponentGrid);
  }

  useEffect(() => {
    if (animatingGrids) {
      knuckleBonesSounds.destroy();
      const timer = setTimeout(() => setAnimatingGrids(null), 500);
      return () => clearTimeout(timer);
    }
  }, [animatingGrids]);

  useEffect(() => {
    if (playPlaceSoundTrigger > 0) knuckleBonesSounds.place();
  }, [playPlaceSoundTrigger]);

  const activeMyGrid = animatingGrids ? animatingGrids.my : myGrid;
  const activeOppGrid = animatingGrids ? animatingGrids.opp : opponentGrid;

  const myScore = calcTotalScore(activeMyGrid);
  const opponentScore = calcTotalScore(activeOppGrid);
  const myColScores = [0, 1, 2].map((col) => calcColScore(activeMyGrid[col]));
  const oppColScores = [0, 1, 2].map((col) => calcColScore(activeOppGrid[col]));

  // Music starts as soon as the modal mounts
  useEffect(() => {
    knuckleBonesSounds.startMusic();
    return () => {
      knuckleBonesSounds.stopMusic();
    };
  }, []);

  // Die roll animation
  // Rapidly cycle random values for ~500 ms then lock onto the actual result.
  const [displayRoll, setDisplayRoll] = useState<number | null>(() => {
    // Show a random face initially to prevent spoiling the roll on mount
    if (
      !frozen &&
      displayRollVal !== null &&
      game.status === "ACTIVE" &&
      (isMyTurn || game.mode === "LIVE")
    ) {
      return Math.ceil(Math.random() * 6);
    }
    return displayRollVal;
  });
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    // Do not animate if frozen, if no die is rolled, or if the game is still PENDING
    if (frozen || displayRollVal === null || game.status !== "ACTIVE") {
      setDisplayRoll(displayRollVal);
      return;
    }

    // In ASYNC mode, only animate our own rolls. In LIVE mode, animate both.
    if (!isMyTurn && game.mode !== "LIVE") {
      setDisplayRoll(displayRollVal);
      return;
    }

    knuckleBonesSounds.roll();
    setIsRolling(true);
    setDisplayRoll(Math.ceil(Math.random() * 6));

    let count = 0;
    const finalValue = displayRollVal;
    const interval = setInterval(() => {
      setDisplayRoll(Math.ceil(Math.random() * 6));
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setDisplayRoll(finalValue);
        setIsRolling(false);
      }
    }, 55);

    return () => clearInterval(interval);
  }, [
    displayRollVal,
    isMyTurn,
    frozen,
    game.status,
    game.mode,
    game.updatedAt,
  ]);

  // Play placement sound when our own grid gains a new die
  const prevMyGridRef = useRef<(number | null)[][]>(myGrid);
  useEffect(() => {
    const prev = prevMyGridRef.current;
    const placed = myGrid.some((col, c) =>
      col.some((val, r) => prev[c]?.[r] === null && val !== null),
    );
    if (placed && !isMyTurn) {
      // Our grid just changed (server confirmed our move) → play place sound
      knuckleBonesSounds.place();
    }
    prevMyGridRef.current = myGrid;
  }, [myGrid, isMyTurn]);

  // Win/draw sound
  const prevStatusRef = useRef(game.status);
  useEffect(() => {
    if (prevStatusRef.current === game.status) return;
    prevStatusRef.current = game.status;
    if (game.status === "COMPLETED" || game.status === "CANCELLED") {
      if (game.status === "CANCELLED" && game.winnerId === null) return; // Prevent sound on pending cancellation
      if (game.isDraw) knuckleBonesSounds.draw();
      else if (game.winnerId === currentUserId) knuckleBonesSounds.win();
      else knuckleBonesSounds.lose();
    }
  }, [game.status, game.isDraw, game.winnerId, currentUserId]);

  // Column click
  const handleColumnClick = (col: number) => {
    if (!isMyTurn || isDone) return;
    if (myGrid[col].every((v) => v !== null)) return;
    // Ensure music is playing (fallback if autoplay was blocked on mount)
    knuckleBonesSounds.startMusic();
    knuckleBonesSounds.select();
    onSelectColumn(selectedColumn === col ? null : col);
  };

  // Status text
  const statusText = (() => {
    if (game.status === "PENDING") return t("minigames.status_pending");
    if (isDone) {
      if (game.status === "CANCELLED" || game.status === "DECLINED") return "";
      if (game.isDraw) return t("minigames.status_draw");
      if (game.winnerId === currentUserId) return t("minigames.status_you_won");
      if (game.winnerId)
        return t("minigames.status_opponent_won", {
          username: opponentPlayer.username
            ? `u/${opponentPlayer.username}`
            : (opponentPlayer.name ?? "Opponent"),
        });
      return "";
    }
    if (isMyTurn) {
      return displayRollVal !== null
        ? t("minigames.status_your_turn_place", {
            value: String(displayRollVal),
          })
        : t("minigames.status_your_turn");
    }
    return t("minigames.status_waiting");
  })();

  // Grid renderer
  // bottomPlayer=true  → rows [0,1,2]: row 0 at visual top  (gap-facing, fills first)
  // bottomPlayer=false → rows [2,1,0]: row 0 at visual bottom (gap-facing, fills first)
  // Both grids grow away from the central gap, creating the "facing" effect.
  const renderGrid = (grid: (number | null)[][], bottomPlayer: boolean) => {
    const rowOrder = bottomPlayer ? [0, 1, 2] : [2, 1, 0];
    return (
      <div className="flex flex-col gap-1.5">
        {rowOrder.map((rowIdx) => (
          <div key={rowIdx} className="flex gap-1.5">
            {[0, 1, 2].map((col) => {
              const nextEmptyRow = bottomPlayer
                ? grid[col].findIndex((v) => v === null)
                : -1;
              const isSelectedSlot =
                bottomPlayer &&
                isMyTurn &&
                selectedColumn === col &&
                rowIdx === nextEmptyRow;

              return (
                <GridCell
                  key={col}
                  value={grid[col][rowIdx]}
                  colValues={grid[col]}
                  isSelectedSlot={isSelectedSlot}
                  pendingValue={displayRollVal}
                  isDestroying={
                    !!animatingGrids &&
                    animatingGrids.destroying.some(
                      (d) =>
                        d.isMine === bottomPlayer &&
                        d.col === col &&
                        d.val === grid[col][rowIdx],
                    )
                  }
                  isClickable={
                    bottomPlayer &&
                    isMyTurn &&
                    !isDone &&
                    !grid[col].every((v) => v !== null)
                  }
                  onClick={() => bottomPlayer && handleColumnClick(col)}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      {/* Status */}
      <p
        className={cn(
          "text-sm font-bold text-center transition-colors min-h-[20px]",
          isMyTurn && !isDone ? "text-brand" : "text-foreground-60",
        )}
      >
        {statusText}
      </p>

      {/* Game board */}
      <div className="relative flex flex-col items-center">
        {/* TOP PLAYER (opponent) */}
        <div className="flex items-start gap-3">
          {/* Left spacer matches right info strip width */}
          <div className="w-14" />

          {/* Opponent grid: row 0 at bottom (adjacent to gap) */}
          {renderGrid(activeOppGrid, false)}

          {/* RIGHT side: die (top) → avatar → username → score */}
          <div className="flex flex-col items-center gap-1 w-14">
            {/* Die shown when it is NOT my turn (opponent's pending roll) */}
            <div
              className={cn("w-9 h-9", isMyTurn ? "opacity-0" : "opacity-100")}
            >
              {displayRoll !== null &&
              !isDone &&
              !isMyTurn &&
              !frozen &&
              game.status === "ACTIVE" ? (
                <DieFace
                  value={displayRoll}
                  className={isRolling ? "animate-pulse" : undefined}
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            <PlayerAvatar
              player={opponentPlayer}
              highlight={!isMyTurn && game.status === "ACTIVE"}
            />
            <span className="text-[9px] font-bold text-foreground-60 truncate max-w-full text-center">
              u/{opponentPlayer.username ?? t("minigames.legend_opponent")}
            </span>
            <span className="text-xs font-black text-foreground">
              {opponentScore}
            </span>
          </div>
        </div>

        {/* COLUMN TOTALS (between grids) */}
        <div className="flex flex-col items-center gap-0.5 py-2">
          {/* Opponent column scores (just below their grid) */}
          <div className="flex gap-1.5">
            {oppColScores.map((score, col) => (
              <div
                key={col}
                className="w-10 sm:w-11 text-center text-[10px] font-bold text-foreground-40"
              >
                {score > 0 ? score : ""}
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="flex gap-1.5 my-0.5">
            {[0, 1, 2].map((col) => (
              <div key={col} className="w-10 sm:w-11 h-px bg-surface-border" />
            ))}
          </div>

          {/* My column scores (just above my grid) */}
          <div className="flex gap-1.5">
            {myColScores.map((score, col) => (
              <div
                key={col}
                className={cn(
                  "w-10 sm:w-11 text-center text-[10px] font-bold transition-colors",
                  isMyTurn && selectedColumn === col
                    ? "text-brand"
                    : score > 0
                      ? "text-foreground-60"
                      : "text-transparent",
                )}
              >
                {score > 0 ? score : ""}
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM PLAYER (me) */}
        <div className="flex items-start gap-3">
          {/* LEFT side: avatar → username → score → die (below score) */}
          <div className="flex flex-col items-center gap-1 w-14">
            <PlayerAvatar player={myPlayer} highlight={isMyTurn && !isDone} />
            <span className="text-[9px] font-bold text-foreground-60 truncate max-w-full text-center">
              u/{myPlayer.username ?? "?"}
            </span>
            <span className="text-xs font-black text-foreground">
              {myScore}
            </span>
            {/* Die shown when it IS my turn */}
            <div
              className={cn(
                "w-9 h-9 mt-0.5",
                !isMyTurn ? "opacity-0" : "opacity-100",
              )}
            >
              {displayRoll !== null &&
              !isDone &&
              isMyTurn &&
              !frozen &&
              game.status === "ACTIVE" ? (
                <DieFace
                  value={displayRoll}
                  bgColor="var(--brand)"
                  className={isRolling ? "animate-pulse" : undefined}
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          </div>

          {/* My grid: row 0 at top (adjacent to gap), fills downward */}
          {renderGrid(activeMyGrid, true)}

          {/* Right spacer */}
          <div className="w-14" />
        </div>

        {/* END GAME OVERLAY */}
        {isDone && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 backdrop-blur-sm rounded-2xl animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-3 px-4 text-center">
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
                          username: `u/${opponentPlayer.username ?? "Opponent"}`,
                        })}
                      </p>
                    </>
                  )}
                </>
              ) : game.isDraw ? (
                <>
                  <p className="text-xl font-black text-foreground">
                    {t("minigames.status_draw")}
                  </p>
                  <div className="flex items-baseline gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black">{myScore}</span>
                      <span className="text-[10px] text-foreground-40 uppercase">
                        {t("minigames.legend_you")}
                      </span>
                    </div>
                    <span className="text-foreground-40 font-bold">vs</span>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black">
                        {opponentScore}
                      </span>
                      <span className="text-[10px] text-foreground-40 uppercase truncate max-w-[64px]">
                        u/
                        {opponentPlayer.username ??
                          t("minigames.legend_opponent")}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-black text-foreground">
                    {game.winnerId === currentUserId
                      ? t("minigames.status_you_won")
                      : t("minigames.status_opponent_won", {
                          username: opponentPlayer.username ?? "Opponent",
                        })}
                  </p>
                  <div className="flex items-baseline gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "text-3xl font-black",
                          game.winnerId === currentUserId
                            ? "text-brand"
                            : "text-foreground",
                        )}
                      >
                        {myScore}
                      </span>
                      <span className="text-[10px] text-foreground-40 uppercase">
                        {t("minigames.legend_you")}
                      </span>
                    </div>
                    <span className="text-foreground-40 font-bold">vs</span>
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "text-3xl font-black",
                          game.winnerId !== currentUserId &&
                            game.winnerId !== null
                            ? "text-brand"
                            : "text-foreground",
                        )}
                      >
                        {opponentScore}
                      </span>
                      <span className="text-[10px] text-foreground-40 uppercase truncate max-w-[64px]">
                        u/
                        {opponentPlayer.username ??
                          t("minigames.legend_opponent")}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground-40">
                    +{Math.abs(myScore - opponentScore)} pts
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Column selection buttons (only when it's my turn) */}
      {isMyTurn && !isDone && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((col) => {
            const full = activeMyGrid[col].every((v) => v !== null);
            return (
              <button
                key={col}
                type="button"
                onClick={() => handleColumnClick(col)}
                disabled={full}
                className={cn(
                  "w-10 sm:w-11 text-center text-[10px] font-bold uppercase tracking-wider transition-colors py-1 rounded",
                  full
                    ? "text-foreground-40 line-through cursor-default"
                    : selectedColumn === col
                      ? "text-brand bg-brand/10 cursor-pointer"
                      : "text-foreground-40 hover:text-foreground cursor-pointer",
                )}
              >
                {t("minigames.kb_col", { n: String(col + 1) })}
              </button>
            );
          })}
        </div>
      )}

      {/* Music attribution */}
      <div className="flex items-center gap-1 justify-center">
        <Music className="h-3 w-3 text-foreground-40 flex-shrink-0" />
        <p className="text-[9px] text-foreground-40">
          {t("minigames.kb_music_credit")}
        </p>
      </div>
    </div>
  );
}
