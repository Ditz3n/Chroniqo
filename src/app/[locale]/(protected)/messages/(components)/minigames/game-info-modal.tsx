// src/app/[locale]/(protected)/messages/(components)/minigames/game-info-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/use-translation";
import { systemSounds } from "@/lib/utils/game-sounds";
import { ApiMinigame, GameType } from "@/types/app-types";
import {
  CheckCircle,
  ChevronRight,
  Circle,
  Clock,
  Dices,
  Hash,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Game metadata

type GameMode = "ASYNC" | "LIVE";

const GAME_META: Record<
  GameType,
  {
    label: string;
    icon: React.ElementType;
    description: string;
    rules: string[];
  }
> = {
  TIC_TAC_TOE: {
    label: "minigames.tic_tac_toe",
    icon: Hash,
    description: "minigames.description_tic_tac_toe",
    rules: [
      "minigames.rules_tic_tac_toe_1",
      "minigames.rules_tic_tac_toe_2",
      "minigames.rules_tic_tac_toe_3",
    ],
  },
  CONNECT_FOUR: {
    label: "minigames.connect_four",
    icon: Circle,
    description: "minigames.description_connect_four",
    rules: [
      "minigames.rules_connect_four_1",
      "minigames.rules_connect_four_2",
      "minigames.rules_connect_four_3",
    ],
  },
  KNUCKLEBONES: {
    label: "minigames.knucklebones",
    icon: Dices,
    description: "minigames.description_knucklebones",
    rules: [
      "minigames.rules_knucklebones_1",
      "minigames.rules_knucklebones_2",
      "minigames.rules_knucklebones_3",
      "minigames.rules_knucklebones_4",
      "minigames.rules_knucklebones_5",
    ],
  },
};

// Props

interface GameInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType;
  currentUserId: string;
  /** Existing game - present when viewing a challenge or active game. Absent when creating. */
  game?: ApiMinigame | null;
  /** Required when creating (game is null) */
  opponentId?: string;
  opponentUsername?: string;
  conversationId?: string;
  onCreated?: (game: ApiMinigame) => void;
  onAccepted?: (game: ApiMinigame) => void;
  onDeclined?: () => void;
  onCancelled?: () => void;
  /** Parent opens the play modal with this game */
  onOpenPlay?: (game: ApiMinigame) => void;
  /** Parent switches to the history sub-modal */
  onOpenHistory?: () => void;
}

// Component

export function GameInfoModal({
  isOpen,
  onClose,
  gameType,
  currentUserId,
  game,
  opponentId,
  opponentUsername,
  conversationId,
  onCreated,
  onAccepted,
  onDeclined,
  onCancelled,
  onOpenPlay,
  onOpenHistory,
}: GameInfoModalProps) {
  const { t } = useTranslation();
  const meta = GAME_META[gameType];

  const [selectedMode, setSelectedMode] = useState<GameMode>("ASYNC");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [successText, setSuccessText] = useState("");
  const [successOpacity, setSuccessOpacity] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scenario flags
  const isCreating = !game;
  const isPendingPlayer1 =
    game?.status === "PENDING" && game?.player1Id === currentUserId;
  const isPendingPlayer2 =
    game?.status === "PENDING" && game?.player2Id === currentUserId;
  const isActiveMyTurn =
    game?.status === "ACTIVE" && game?.currentTurnId === currentUserId;
  const isActiveTheirTurn =
    game?.status === "ACTIVE" && game?.currentTurnId !== currentUserId;
  const isOver = ["COMPLETED", "CANCELLED", "DECLINED"].includes(
    game?.status ?? "",
  );

  // Play challenge sound when modal opens for the challenged player
  useEffect(() => {
    if (isOpen && isPendingPlayer2) {
      systemSounds.challenge();
    }
  }, [isOpen, isPendingPlayer2]);

  const resetState = () => {
    setIsLoading(false);
    setPhase("idle");
    setSuccessOpacity(0);
    setIsTransitioning(false);
  };

  const handleClose = () => {
    if (isTransitioning) return;
    if (closeRef.current) clearTimeout(closeRef.current);
    if (successRef.current) clearTimeout(successRef.current);
    resetState();
    onClose();
  };

  const triggerSuccess = (text: string, callback?: () => void) => {
    setIsTransitioning(true);
    setPhase("success");
    setSuccessText(text);
    successRef.current = setTimeout(() => setSuccessOpacity(1), 300);
    closeRef.current = setTimeout(() => {
      onClose();
      resetState();
      callback?.();
    }, 1900);
  };

  const handleCreate = async () => {
    if (!opponentId || !conversationId || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/minigames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: gameType,
          mode: selectedMode,
          opponentId,
          conversationId,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      if (selectedMode === "LIVE") {
        onClose();
        resetState();
        onCreated?.(data.game);
      } else {
        triggerSuccess(t("minigames.success_challenge_sent"), () =>
          onCreated?.(data.game),
        );
      }
    } catch {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!game || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/minigames/${game.id}/accept`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      onClose();
      resetState();
      onAccepted?.(data.game);
    } catch {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!game || isLoading) return;
    setIsLoading(true);
    try {
      await fetch(`/api/minigames/${game.id}/cancel`, { method: "POST" });
      triggerSuccess(t("minigames.success_challenge_declined"), onDeclined);
    } catch {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!game || isLoading) return;
    setIsLoading(true);
    try {
      await fetch(`/api/minigames/${game.id}/cancel`, { method: "POST" });
      triggerSuccess(t("minigames.success_challenge_cancelled"), onCancelled);
    } catch {
      setIsLoading(false);
    }
  };

  const handleForfeit = async () => {
    if (!game || isLoading) return;
    setIsLoading(true);
    try {
      await fetch(`/api/minigames/${game.id}/cancel`, { method: "POST" });
      triggerSuccess(t("minigames.success_you_forfeited"), onCancelled);
    } catch {
      setIsLoading(false);
    }
  };

  const handleTakeTurn = () => {
    if (!game || !onOpenPlay) return;
    onOpenPlay(game);
  };

  const show = phase === "idle";
  const gridStyle: React.CSSProperties = { overflow: "clip", minHeight: 0 };

  if (!meta) return null;

  const overSummary = (() => {
    if (!isOver || !game) return null;
    if (game.status === "CANCELLED") return t("minigames.over_cancelled");
    if (game.status === "DECLINED") return t("minigames.over_declined");
    if (game.isDraw) return t("minigames.over_draw");
    if (game.winnerId === currentUserId) return t("minigames.over_you_won");
    const winnerName = game.winner?.username
      ? `u/${game.winner.username}`
      : t("minigames.over_opponent");
    return t("minigames.over_opponent_won", { username: winnerName });
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
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = meta.icon;
              return (
                <Icon className="h-5 w-5 text-foreground-60 flex-shrink-0" />
              );
            })()}
            <DialogTitle className="font-bold text-foreground">
              {t(meta.label)}
            </DialogTitle>
          </div>
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
          {/* Main content - collapses out on success */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: show ? "1fr" : "0fr",
              transition: "grid-template-rows 300ms ease-in-out",
            }}
          >
            <div style={gridStyle}>
              <div
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                }}
              >
                {/* Challenge notice - shown when player2 receives a live invitation */}
                {isPendingPlayer2 && opponentUsername && (
                  <div className="mb-4 p-3 rounded-xl bg-brand/5 border border-brand/20 text-sm font-semibold text-brand text-center">
                    {t("minigames.challenge_notice", {
                      username: opponentUsername,
                    })}
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-foreground-60 mb-4">
                  {t(meta.description)}
                </p>

                {/* Rules */}
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground-40 mb-2">
                    {t("minigames.rules_label")}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {meta.rules.map((rule) => (
                      <li
                        key={rule}
                        className="flex items-start gap-2 text-sm text-foreground-67"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-feedback-success flex-shrink-0" />
                        {t(rule)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mode selector - only shown when creating */}
                {isCreating && (
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground-40 mb-2">
                      {t("minigames.mode_label")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          {
                            value: "ASYNC" as const,
                            icon: Clock,
                            label: t("minigames.mode_async"),
                            desc: t("minigames.mode_async_desc"),
                          },
                          {
                            value: "LIVE" as const,
                            icon: Zap,
                            label: t("minigames.mode_live"),
                            desc: t("minigames.mode_live_desc"),
                          },
                        ] as const
                      ).map(({ value, icon: Icon, label, desc }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedMode(value)}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            selectedMode === value
                              ? "border-brand bg-brand/5"
                              : "border-surface-border bg-surface hover:bg-surface-hover"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon
                              className={`h-3.5 w-3.5 ${selectedMode === value ? "text-brand" : "text-foreground-40"}`}
                            />
                            <span
                              className={`text-sm font-bold ${selectedMode === value ? "text-brand" : "text-foreground"}`}
                            >
                              {label}
                            </span>
                          </div>
                          <span className="text-xs text-foreground-60">
                            {desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous games link */}
                {(opponentId ?? game?.player2Id ?? game?.player1Id) && (
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors cursor-pointer mb-2 group"
                  >
                    {opponentUsername
                      ? t("minigames.btn_history_user", {
                          username: opponentUsername,
                        })
                      : t("minigames.btn_history")}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}

                {/* Over summary */}
                {isOver && overSummary && (
                  <div className="mt-3 p-3 rounded-xl bg-surface border border-surface-border text-sm font-semibold text-foreground text-center">
                    {overSummary}
                  </div>
                )}

                {/* Active game - their turn indicator */}
                {isActiveTheirTurn && (
                  <div className="mt-3 mb-4 p-3 rounded-xl bg-surface border border-surface-border text-sm text-foreground-60 text-center">
                    {t("minigames.over_their_turn")}
                  </div>
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
                {successText}
              </p>
            </div>
          )}

          {/* Footer actions */}
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
                className="flex items-center justify-end gap-3 px-4 py-3 border-t border-surface-border bg-surface"
                style={{
                  opacity: show ? 1 : 0,
                  transition: "opacity 150ms ease-in-out",
                  pointerEvents: show ? "auto" : "none",
                }}
              >
                {isCreating && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      {t("minigames.btn_cancel")}
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={handleCreate}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t("minigames.btn_send_challenge")
                      )}
                    </Button>
                  </>
                )}

                {isPendingPlayer2 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDecline}
                      disabled={isLoading}
                    >
                      {t("minigames.btn_decline")}
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={handleAccept}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t("minigames.btn_accept")
                      )}
                    </Button>
                  </>
                )}

                {isPendingPlayer1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      {t("minigames.btn_close")}
                    </Button>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t("minigames.btn_cancel_challenge")
                      )}
                    </Button>
                  </>
                )}

                {isActiveMyTurn && (
                  <>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={handleForfeit}
                      disabled={isLoading}
                    >
                      {t("minigames.btn_forfeit")}
                    </Button>
                    <Button variant="brand" size="sm" onClick={handleTakeTurn}>
                      {t("minigames.btn_take_turn")}
                    </Button>
                  </>
                )}

                {isActiveTheirTurn && (
                  <>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={handleForfeit}
                      disabled={isLoading}
                    >
                      {t("minigames.btn_forfeit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      {t("minigames.btn_close")}
                    </Button>
                  </>
                )}

                {isOver && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    {t("minigames.btn_close")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
