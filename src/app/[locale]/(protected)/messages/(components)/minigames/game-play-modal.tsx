// src/app/[locale]/(protected)/messages/(components)/minigames/game-play-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMinigame } from "@/lib/hooks/use-chat";
import { useTranslation } from "@/lib/hooks/use-translation";
import { gameMusic } from "@/lib/utils/game-sounds";
import { ApiMinigame } from "@/types/app-types";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ConnectFour } from "./connect-four";
import { KnuckleBones } from "./knucklebones";
import { TicTacToe } from "./tic-tac-toe";

const GAME_LABELS: Record<string, string> = {
  TIC_TAC_TOE: "minigames.tic_tac_toe",
  CONNECT_FOUR: "minigames.connect_four",
  KNUCKLEBONES: "minigames.knucklebones",
};

interface GamePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGame: ApiMinigame;
  onMoveComplete?: () => void;
}

export function GamePlayModal({
  isOpen,
  onClose,
  initialGame,
  onMoveComplete,
}: GamePlayModalProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  // Poll live game state while modal is open
  const { data: gameData, mutate } = useMinigame(
    isOpen ? initialGame.id : null,
    (initialGame.mode ?? "ASYNC") as "ASYNC" | "LIVE",
  );
  const game: ApiMinigame = gameData?.game ?? initialGame;
  const isLive = (game.mode ?? "ASYNC") === "LIVE";

  // Start/stop per-game background music
  useEffect(() => {
    if (game.type === "TIC_TAC_TOE") {
      gameMusic.startTicTacToe();
      return () => {
        gameMusic.stopTicTacToe();
      };
    }
    if (game.type === "CONNECT_FOUR") {
      gameMusic.startConnectFour();
      return () => {
        gameMusic.stopConnectFour();
      };
    }
    // Knucklebones music is handled inside knucklebones.tsx itself
  }, [game.type]);
  const isMyTurn =
    game.currentTurnId === currentUserId && game.status === "ACTIVE";

  // Selection state - the position the player has chosen but not yet confirmed
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Success transition state
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Overrides computed successMessage for forfeit/disconnect cases
  const [successOverride, setSuccessOverride] = useState<string | null>(null);
  // Tracks whether the current user initiated the forfeit (vs opponent forfeited)
  const [selfForfeited, setSelfForfeited] = useState(false);

  // Disconnect detection (LIVE mode only)
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(
    null,
  );
  const lastActivityRef = useRef<string>(initialGame.updatedAt);

  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = () => {
    setSelectedPosition(null);
    setPhase("idle");
    setSuccessOpacity(0);
    setIsTransitioning(false);
    setIsSubmitting(false);
    setSuccessOverride(null);
    setDisconnectCountdown(null);
    setSelfForfeited(false);
  };

  useEffect(() => {
    return () => {
      if (closeRef.current) clearTimeout(closeRef.current);
      if (successRef.current) clearTimeout(successRef.current);
    };
  }, []);

  // Reset position selection whenever the game state updates
  useEffect(() => {
    setSelectedPosition(null);
  }, [game.updatedAt]);

  // Disconnect detection: fires when opponent is inactive in LIVE mode
  useEffect(() => {
    if (!isLive || game.status !== "ACTIVE" || isMyTurn) {
      setDisconnectCountdown(null);
      return;
    }
    // Opponent moved - reset any active countdown
    if (game.updatedAt !== lastActivityRef.current) {
      lastActivityRef.current = game.updatedAt;
      setDisconnectCountdown(null);
    }
    // Begin countdown warning after 30 s with no activity from opponent
    const timeout = setTimeout(() => setDisconnectCountdown(15), 30_000);
    return () => clearTimeout(timeout);
  }, [game.updatedAt, game.status, isLive, isMyTurn]);

  // Countdown: auto-cancels game when it reaches 0
  useEffect(() => {
    if (disconnectCountdown === null) return;
    if (disconnectCountdown <= 0) {
      fetch(`/api/minigames/${game.id}/cancel`, { method: "POST" }).then(() =>
        mutate(),
      );
      return;
    }
    const timer = setTimeout(
      () => setDisconnectCountdown((v) => (v !== null ? v - 1 : null)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [disconnectCountdown, game.id, mutate]);

  const handleClose = () => {
    if (isTransitioning) return;
    if (closeRef.current) clearTimeout(closeRef.current);
    if (successRef.current) clearTimeout(successRef.current);
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    if (selectedPosition === null || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/minigames/${game.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: selectedPosition }),
      });
      if (!res.ok) throw new Error("Failed");

      const updated = await mutate();
      const updatedGame = (updated as { game?: ApiMinigame } | undefined)?.game;
      const isGameOver =
        updatedGame?.status === "COMPLETED" ||
        updatedGame?.status === "CANCELLED" ||
        updatedGame?.status === "DECLINED";

      // LIVE mode, or the game just ended (win/draw/cancel):
      // stay open so the player can see the result and close manually.
      // Child components render their own result overlays.
      if (isLive || isGameOver) {
        setSelectedPosition(null);
        setIsSubmitting(false);
        onMoveComplete?.();
        return;
      }

      // ASYNC, game still active: brief pause to read board, then "move sent" collapse
      closeRef.current = setTimeout(() => {
        setIsTransitioning(true);
        setPhase("success");
        successRef.current = setTimeout(() => setSuccessOpacity(1), 300);
        closeRef.current = setTimeout(() => {
          onClose();
          resetState();
          onMoveComplete?.();
        }, 2000);
      }, 700);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleCancelGame = async () => {
    if (isTransitioning) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/minigames/${game.id}/cancel`, { method: "POST" });

      // If we cancel a PENDING challenge, we don't want to show a "You Lose" board overlay.
      // We just collapse the modal instantly with a success message, exactly like sending a move.
      if (game.status === "PENDING") {
        setIsSubmitting(false);
        setIsTransitioning(true);
        setPhase("success");
        setSuccessOverride(t("minigames.success_challenge_cancelled"));
        successRef.current = setTimeout(() => setSuccessOpacity(1), 300);
        closeRef.current = setTimeout(() => {
          onClose();
          resetState();
          onMoveComplete?.();
        }, 2000);
        return; // Prevent mutate() from triggering the child component's end-screen
      }

      // Mark that this user initiated the forfeit so child overlays can say "You forfeited"
      setSelfForfeited(true);
      setIsSubmitting(false);
      // Refresh game state - the child overlay handles the visual; modal stays open
      await mutate();
    } catch {
      setIsSubmitting(false);
      handleClose();
    }
  };

  const show = phase === "idle";
  const gridStyle: React.CSSProperties = { overflow: "clip", minHeight: 0 };
  const canConfirm =
    isMyTurn && selectedPosition !== null && !isSubmitting && show;

  const confirmLabel =
    game.type === "KNUCKLEBONES"
      ? t("minigames.btn_confirm_place")
      : t("minigames.btn_confirm_move");

  const successMessage =
    successOverride ??
    (() => {
      const updatedGame = (gameData as { game?: ApiMinigame } | undefined)
        ?.game;
      if (!updatedGame) return t("minigames.success_move_sent");
      if (updatedGame.status === "COMPLETED") {
        if (updatedGame.isDraw) return t("minigames.over_draw");
        if (updatedGame.winnerId === currentUserId)
          return t("minigames.status_you_won");
        return t("minigames.status_opponent_won", {
          username: updatedGame.winner?.username ?? "Opponent",
        });
      }
      if (updatedGame.status === "CANCELLED")
        return t("minigames.over_cancelled");
      if (updatedGame.status === "DECLINED")
        return t("minigames.over_declined");
      return t("minigames.success_move_sent");
    })();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isTransitioning && handleClose()}
    >
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border"
        aria-describedby={undefined}
      >
        <DialogHeader
          className="bg-surface py-4"
          onClose={isTransitioning ? undefined : handleClose}
        >
          <DialogTitle className="font-bold text-foreground">
            {t(GAME_LABELS[game.type] ?? game.type)}
          </DialogTitle>
        </DialogHeader>

        <DialogBody
          style={{
            overflowY: "hidden",
            position: "relative",
            // When both inner grids collapse to 0fr the body height reaches 0,
            // leaving the absolute success overlay nothing to fill. A minimum
            // height keeps the overlay vertically centred during the transition.
            minHeight: !show ? "160px" : undefined,
          }}
        >
          {/* Game board (collapses on success) */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridStyle}>
              <div
                className="py-2 relative"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                {/* Pending overlay  dims the board while waiting for opponent to accept LIVE challenge */}
                {game.status === "PENDING" && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-3 z-10">
                    <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <p className="text-sm font-semibold text-foreground-60 text-center px-6">
                      {t("minigames.pending_waiting_for_accept")}
                    </p>
                  </div>
                )}

                {game.type === "TIC_TAC_TOE" && (
                  <TicTacToe
                    game={game}
                    currentUserId={currentUserId}
                    selectedCell={selectedPosition}
                    onSelectCell={setSelectedPosition}
                    selfForfeited={selfForfeited}
                  />
                )}
                {game.type === "CONNECT_FOUR" && (
                  <ConnectFour
                    game={game}
                    currentUserId={currentUserId}
                    selectedColumn={selectedPosition}
                    onSelectColumn={setSelectedPosition}
                    selfForfeited={selfForfeited}
                  />
                )}
                {game.type === "KNUCKLEBONES" && (
                  <KnuckleBones
                    game={game}
                    currentUserId={currentUserId}
                    selectedColumn={selectedPosition}
                    onSelectColumn={setSelectedPosition}
                    selfForfeited={selfForfeited}
                    frozen={isSubmitting}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Success overlay - absolutely fills DialogBody, text perfectly centred */}
          {!show && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
              style={{
                opacity: successOpacity,
                transition: "opacity 300ms ease-in-out",
              }}
            >
              <p className="text-foreground font-bold text-lg text-center px-4">
                {successMessage}
              </p>
            </div>
          )}

          {/* LIVE: waiting for opponent indicator */}
          {isLive && game.status === "ACTIVE" && !isMyTurn && show && (
            <div className="flex items-center justify-center gap-2 py-3 -mx-4 border-t border-surface-border bg-surface/40">
              <div className="h-3 w-3 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <span className="text-xs font-semibold text-foreground-60">
                {t("minigames.live_mode_opponent_turn")}
              </span>
            </div>
          )}

          {/* LIVE: disconnect countdown warning */}
          {isLive && disconnectCountdown !== null && show && (
            <div className="py-3 -mx-4 border-t border-surface-border bg-brand/5 text-center">
              <p className="text-xs font-bold text-brand">
                {t("minigames.live_disconnect_warning", {
                  seconds: String(disconnectCountdown),
                })}
              </p>
            </div>
          )}

          {/* Footer */}
          <div
            className="-mx-4 -mb-4"
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridStyle}>
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 border-t border-surface-border bg-surface"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                  pointerEvents: show ? "auto" : "none",
                }}
              >
                {game.status === "PENDING" ? (
                  // Waiting for opponent to accept LIVE challenge - only allow cancelling
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={handleCancelGame}
                    disabled={isSubmitting}
                    className="ml-auto"
                  >
                    {t("minigames.btn_cancel_challenge")}
                  </Button>
                ) : game.status !== "ACTIVE" ? (
                  // Game ended - only a Close button
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    className="ml-auto"
                  >
                    {t("minigames.btn_close")}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={handleCancelGame}
                      disabled={isSubmitting}
                    >
                      {t("minigames.btn_forfeit")}
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={handleConfirm}
                      disabled={!canConfirm}
                    >
                      {confirmLabel}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
