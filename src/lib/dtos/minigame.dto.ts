// src/lib/dtos/minigame.dto.ts
import { z } from "zod";

export const GAME_TYPES = [
  "TIC_TAC_TOE",
  "CONNECT_FOUR",
  "KNUCKLEBONES",
] as const;

export const GAME_MODES = ["ASYNC", "LIVE"] as const;

export const createMinigameSchema = z.object({
  type: z.enum(GAME_TYPES),
  mode: z.enum(GAME_MODES).default("ASYNC"),
  // The opponent (player2) to challenge
  opponentId: z.string().min(1, "Opponent ID is required"),
  // The conversation where game system messages will be posted
  conversationId: z.string().min(1, "Conversation ID is required"),
});

export type CreateMinigameDTO = z.infer<typeof createMinigameSchema>;

// A single numeric position used for all game types:
//   TicTacToe      -> cellIndex 0-8
//   ConnectFour    -> column   0-6
//   Knucklebones   -> column  0-2
// Server validates the range against the specific game type.
export const makeMoveSchema = z.object({
  position: z.number().int().min(0).max(8),
});

export type MakeMoveDTO = z.infer<typeof makeMoveSchema>;
