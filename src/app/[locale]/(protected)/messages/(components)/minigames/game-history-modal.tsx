// src/app/[locale]/(protected)/messages/(components)/minigames/game-history-modal.tsx
"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ApiMinigame, GameType } from "@/types/app-types";
import { Circle, Dices, Hash } from "lucide-react";
import useSWR from "swr";

const GAME_LABELS: Record<GameType, string> = {
  TIC_TAC_TOE: "minigames.tic_tac_toe",
  CONNECT_FOUR: "minigames.connect_four",
  KNUCKLEBONES: "minigames.knucklebones",
};

const GAME_ICON: Record<GameType, React.ElementType> = {
  TIC_TAC_TOE: Hash,
  CONNECT_FOUR: Circle,
  KNUCKLEBONES: Dices,
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void; // closes this and lets parent reopen the info modal
  opponentId: string;
  opponentUsername: string;
  currentUserId: string;
}

function ResultBadge({
  game,
  currentUserId,
}: {
  game: ApiMinigame;
  currentUserId: string;
}) {
  const { t } = useTranslation();
  if (game.isDraw) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/10 text-foreground-60">
        {t("minigames.history_draw_badge")}
      </span>
    );
  }
  const won = game.winnerId === currentUserId;
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        won
          ? "bg-feedback-success/15 text-feedback-success"
          : "bg-brand/15 text-brand"
      }`}
    >
      {won
        ? t("minigames.history_win_badge")
        : t("minigames.history_loss_badge")}
    </span>
  );
}

export function GameHistoryModal({
  isOpen,
  onClose,
  opponentId,
  opponentUsername,
  currentUserId,
}: GameHistoryModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useSWR(
    isOpen ? `/api/minigames/history/${opponentId}` : null,
    fetcher,
  );

  const games: ApiMinigame[] = data?.games ?? [];

  // Tally across all games
  const wins = games.filter((g) => g.winnerId === currentUserId).length;
  const losses = games.filter(
    (g) => g.winnerId && g.winnerId !== currentUserId,
  ).length;
  const draws = games.filter((g) => g.isDraw).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background border-surface-border"
        aria-describedby={undefined}
      >
        <DialogHeader className="bg-surface py-4" onClose={onClose}>
          <DialogTitle className="font-bold text-foreground">
            {t("minigames.history_title", { username: opponentUsername })}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Score tally */}
          {games.length > 0 && (
            <div className="flex justify-around pb-4 mb-4 border-b border-surface-border">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black text-feedback-success">
                  {wins}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                  {t("minigames.history_wins_label")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black text-brand">{losses}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                  {t("minigames.history_losses_label")}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-black text-foreground-60">
                  {draws}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-40">
                  {t("minigames.history_draws_label")}
                </span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : games.length === 0 ? (
            <p className="text-center text-sm text-foreground-60 py-8 font-medium">
              {t("minigames.history_empty", { username: opponentUsername })}
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="flex flex-col gap-2 pr-4">
                {games.map((g) => {
                  const completedAt = g.completedAt
                    ? new Date(g.completedAt).toLocaleDateString("da-DK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : null;
                  const GameIcon = GAME_ICON[g.type as GameType] ?? Dices;

                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-surface-border"
                    >
                      <div className="flex items-center gap-2.5">
                        <GameIcon className="h-4 w-4 text-foreground-60 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {t(GAME_LABELS[g.type as GameType])}
                          </span>
                          {completedAt && (
                            <span className="text-xs text-foreground-40">
                              {completedAt}
                            </span>
                          )}
                        </div>
                      </div>
                      <ResultBadge game={g} currentUserId={currentUserId} />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
