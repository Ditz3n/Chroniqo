// src/services/minigame.service.ts
import { CreateMinigameDTO } from "@/lib/dtos/minigame.dto";
import { prisma } from "@/lib/prisma";
import {
  ConnectFourState,
  KnuckleBonesState,
  TicTacToeState,
} from "@/types/app-types";
import crypto from "crypto";

// Constants

const PLAYER1 = "PLAYER1";
const PLAYER2 = "PLAYER2";
const COLS_CF = 7;
const ROWS_CF = 6;

const TTT_WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

// Prisma select helper (shared shape for all game queries)

const gameInclude = {
  player1: {
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      avatarEmoji: true,
      avatarBgColor: true,
    },
  },
  player2: {
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      avatarEmoji: true,
      avatarBgColor: true,
    },
  },
  winner: {
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      avatarEmoji: true,
      avatarBgColor: true,
    },
  },
} as const;

// Dice helper (server-side only - prevents client-side cheating)

function rollDie(): number {
  return crypto.randomInt(1, 7); // returns [1, 6] inclusive
}

// Tic-Tac-Toe logic

function checkTicTacToeResult(board: (string | null)[]): {
  winner: string | null;
  isDraw: boolean;
} {
  for (const [a, b, c] of TTT_WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a]!, isDraw: false };
    }
  }
  return { winner: null, isDraw: board.every((cell) => cell !== null) };
}

function applyTicTacToeMove(
  state: TicTacToeState,
  playerSlot: "PLAYER1" | "PLAYER2",
  cellIndex: number,
): TicTacToeState | null {
  if (cellIndex < 0 || cellIndex > 8) return null;
  if (state.board[cellIndex] !== null) return null; // cell occupied
  const board = [...state.board];
  board[cellIndex] = playerSlot;
  return { board };
}

// Connect Four logic

function checkConnectFourResult(board: (string | null)[][]): {
  winner: string | null;
  isDraw: boolean;
} {
  // Horizontal
  for (let row = 0; row < ROWS_CF; row++) {
    for (let col = 0; col <= COLS_CF - 4; col++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col + 1][row] &&
        cell === board[col + 2][row] &&
        cell === board[col + 3][row]
      ) {
        return { winner: cell, isDraw: false };
      }
    }
  }
  // Vertical
  for (let col = 0; col < COLS_CF; col++) {
    for (let row = 0; row <= ROWS_CF - 4; row++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col][row + 1] &&
        cell === board[col][row + 2] &&
        cell === board[col][row + 3]
      ) {
        return { winner: cell, isDraw: false };
      }
    }
  }
  // Diagonal ↗
  for (let col = 0; col <= COLS_CF - 4; col++) {
    for (let row = 0; row <= ROWS_CF - 4; row++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col + 1][row + 1] &&
        cell === board[col + 2][row + 2] &&
        cell === board[col + 3][row + 3]
      ) {
        return { winner: cell, isDraw: false };
      }
    }
  }
  // Diagonal ↘
  for (let col = 0; col <= COLS_CF - 4; col++) {
    for (let row = 3; row < ROWS_CF; row++) {
      const cell = board[col][row];
      if (
        cell &&
        cell === board[col + 1][row - 1] &&
        cell === board[col + 2][row - 2] &&
        cell === board[col + 3][row - 3]
      ) {
        return { winner: cell, isDraw: false };
      }
    }
  }
  const isDraw = board.every((col) => col.every((cell) => cell !== null));
  return { winner: null, isDraw };
}

function applyConnectFourMove(
  state: ConnectFourState,
  playerSlot: "PLAYER1" | "PLAYER2",
  column: number,
): ConnectFourState | null {
  if (column < 0 || column >= COLS_CF) return null;
  // Find lowest empty row in the column (row 0 = bottom)
  const col = state.board[column];
  const emptyRow = col.findIndex((cell) => cell === null);
  if (emptyRow === -1) return null; // column full
  const board = state.board.map((c) => [...c]);
  board[column][emptyRow] = playerSlot;
  return { board };
}

// Knucklebones logic

function calcKnuckleColumnScore(col: (number | null)[]): number {
  const dice = col.filter((v): v is number => v !== null);
  const groups = new Map<number, number>();
  dice.forEach((v) => groups.set(v, (groups.get(v) ?? 0) + 1));
  let score = 0;
  groups.forEach((count, value) => (score += count * count * value));
  return score;
}

export function calcKnuckleScore(grid: (number | null)[][]): number {
  return grid.reduce((total, col) => total + calcKnuckleColumnScore(col), 0);
}

function isKnuckleGridFull(grid: (number | null)[][]): boolean {
  return grid.every((col) => col.every((cell) => cell !== null));
}

function compactColumn(col: (number | null)[]): (number | null)[] {
  // Shift dice to bottom, fill top with nulls
  const filled = col.filter((v): v is number => v !== null);
  return [...filled, null, null, null].slice(0, 3) as (number | null)[];
}

function applyKnuckleMove(
  state: KnuckleBonesState,
  isPlayer1Turn: boolean,
  column: number,
): KnuckleBonesState | null {
  if (column < 0 || column > 2) return null;
  if (state.pendingRoll === null) return null;

  const dieValue = state.pendingRoll;
  const myGrid = isPlayer1Turn
    ? state.player1Grid.map((c) => [...c])
    : state.player2Grid.map((c) => [...c]);
  const opponentGrid = isPlayer1Turn
    ? state.player2Grid.map((c) => [...c])
    : state.player1Grid.map((c) => [...c]);

  // Place die in first empty slot (index 0 = bottom)
  const emptyIdx = myGrid[column].findIndex((v) => v === null);
  if (emptyIdx === -1) return null; // column full

  myGrid[column][emptyIdx] = dieValue;

  // Destroy all opponent dice in the same column with the same value
  opponentGrid[column] = compactColumn(
    opponentGrid[column].map((v) => (v === dieValue ? null : v)),
  );

  // Roll the next die for the other player (pre-rolled so it's server-side)
  const nextRoll = rollDie();

  return {
    player1Grid: isPlayer1Turn ? myGrid : opponentGrid,
    player2Grid: isPlayer1Turn ? opponentGrid : myGrid,
    pendingRoll: nextRoll,
  };
}

// System message helper

async function sendGameSystemMessage(
  conversationId: string,
  senderId: string,
  messageType: string,
  payload: Record<string, unknown>,
  gameId: string,
) {
  await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: JSON.stringify(payload),
      isSystem: true,
      messageType,
      minigameId: gameId,
    },
  });
}

// Initial game states

function initialTicTacToeState(): TicTacToeState {
  return { board: Array(9).fill(null) };
}

function initialConnectFourState(): ConnectFourState {
  return {
    board: Array.from({ length: COLS_CF }, () => Array(ROWS_CF).fill(null)),
  };
}

function initialKnuckleBonesState(): KnuckleBonesState {
  // Pre-roll the first die for player1 (who goes first)
  return {
    player1Grid: Array.from({ length: 3 }, () => [null, null, null]),
    player2Grid: Array.from({ length: 3 }, () => [null, null, null]),
    pendingRoll: rollDie(),
  };
}

// Public service methods

export async function createGame(dto: CreateMinigameDTO, player1Id: string) {
  // Validate conversation is a 1-on-1 direct chat
  const conversation = await prisma.conversation.findUnique({
    where: { id: dto.conversationId },
    include: { participants: { select: { userId: true } } },
  });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  if (conversation.isCommunity) throw new Error("COMMUNITY_CHAT_NOT_ALLOWED");

  const participantIds = conversation.participants.map((p) => p.userId);
  if (participantIds.length !== 2) throw new Error("NOT_A_DIRECT_CHAT");
  if (!participantIds.includes(player1Id)) throw new Error("NOT_A_PARTICIPANT");
  if (!participantIds.includes(dto.opponentId))
    throw new Error("OPPONENT_NOT_IN_CHAT");

  // Prevent duplicate active/pending games of the same type between these two players
  const existing = await prisma.minigame.findFirst({
    where: {
      type: dto.type,
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [
        { player1Id, player2Id: dto.opponentId },
        { player1Id: dto.opponentId, player2Id: player1Id },
      ],
    },
  });
  if (existing) throw new Error("GAME_ALREADY_ACTIVE");

  const stateMap = {
    TIC_TAC_TOE: initialTicTacToeState(),
    CONNECT_FOUR: initialConnectFourState(),
    KNUCKLEBONES: initialKnuckleBonesState(),
  };

  const game = await prisma.minigame.create({
    data: {
      type: dto.type,
      mode: dto.mode,
      status: "PENDING",
      player1Id,
      player2Id: dto.opponentId,
      currentTurnId: dto.opponentId, // player2 must accept first
      conversationId: dto.conversationId,
      state: stateMap[dto.type] as object,
    },
    include: gameInclude,
  });

  // Get player1's username for the system message
  const player1 = await prisma.user.findUnique({
    where: { id: player1Id },
    select: { username: true, name: true },
  });

  await sendGameSystemMessage(
    dto.conversationId,
    player1Id,
    "GAME_CHALLENGE",
    {
      gameId: game.id,
      gameType: dto.type,
      challengerUsername: player1?.username ?? "Unknown",
      // Full name used for in-chat display; username used for sidebar preview
      challengerName: player1?.name ?? player1?.username ?? "Unknown",
    },
    game.id,
  );

  return game;
}

export async function getGame(gameId: string, requesterId: string) {
  const game = await prisma.minigame.findUnique({
    where: { id: gameId },
    include: gameInclude,
  });
  if (!game) throw new Error("GAME_NOT_FOUND");
  if (game.player1Id !== requesterId && game.player2Id !== requesterId) {
    throw new Error("NOT_A_PARTICIPANT");
  }
  return game;
}

export async function getConversationActiveGames(
  conversationId: string,
  requesterId: string,
) {
  // Verify the requester is a participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: requesterId },
  });
  if (!participant) throw new Error("NOT_A_PARTICIPANT");

  return prisma.minigame.findMany({
    where: { conversationId, status: { in: ["PENDING", "ACTIVE"] } },
    include: gameInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getGameHistory(userId: string, opponentId: string) {
  return prisma.minigame.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { player1Id: userId, player2Id: opponentId },
        { player1Id: opponentId, player2Id: userId },
      ],
    },
    include: gameInclude,
    orderBy: { completedAt: "desc" },
    take: 50,
  });
}

export async function acceptGame(gameId: string, playerId: string) {
  const game = await prisma.minigame.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("GAME_NOT_FOUND");
  if (game.player2Id !== playerId) throw new Error("NOT_THE_CHALLENGED_PLAYER");
  if (game.status !== "PENDING") throw new Error("GAME_NOT_PENDING");

  const updated = await prisma.minigame.update({
    where: { id: gameId },
    data: {
      status: "ACTIVE",
      // The challenged player (player2) places the first move after accepting
      currentTurnId: game.player2Id,
    },
    include: gameInclude,
  });

  if (game.conversationId) {
    const accepter = await prisma.user.findUnique({
      where: { id: playerId },
      select: { username: true, name: true },
    });
    await sendGameSystemMessage(
      game.conversationId,
      playerId,
      "GAME_ACCEPTED",
      {
        gameId: game.id,
        gameType: game.type,
        accepterUsername: accepter?.username ?? "Unknown",
        accepterName: accepter?.name ?? accepter?.username ?? "Unknown",
      },
      game.id,
    );
  }

  return updated;
}

export async function cancelGame(gameId: string, playerId: string) {
  const game = await prisma.minigame.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("GAME_NOT_FOUND");
  if (game.player1Id !== playerId && game.player2Id !== playerId) {
    throw new Error("NOT_A_PARTICIPANT");
  }
  if (!["PENDING", "ACTIVE"].includes(game.status)) {
    throw new Error("GAME_ALREADY_ENDED");
  }

  // player2 declining a PENDING challenge = DECLINED; player1 withdrawing = CANCELLED
  const isDecline = game.status === "PENDING" && playerId === game.player2Id;
  const isWithdrawal = game.status === "PENDING" && playerId === game.player1Id;
  const newStatus = isDecline ? "DECLINED" : "CANCELLED";
  const messageType = isDecline
    ? "GAME_DECLINED"
    : isWithdrawal
      ? "GAME_WITHDRAWN"
      : "GAME_CANCELLED";

  // When an ACTIVE game is forfeited (cancelled), the other player wins.
  // DECLINED means challenger withdrew before opponent accepted - no winner.
  // ACTIVE forfeit: other player wins. DECLINED (pending): no winner.
  const forfeitWinnerId =
    !isDecline && game.status === "ACTIVE"
      ? playerId === game.player1Id
        ? game.player2Id
        : game.player1Id
      : null;

  const updated = await prisma.minigame.update({
    where: { id: gameId },
    data: {
      status: newStatus,
      completedAt: new Date(),
      // Explicitly set to null for decline, real winner ID for forfeit
      winnerId: forfeitWinnerId,
    },
    include: gameInclude,
  });

  if (game.conversationId) {
    const actor = await prisma.user.findUnique({
      where: { id: playerId },
      select: { username: true, name: true },
    });
    await sendGameSystemMessage(
      game.conversationId,
      playerId,
      messageType,
      {
        gameId: game.id,
        gameType: game.type,
        actorUsername: actor?.username ?? "Unknown",
        actorName: actor?.name ?? actor?.username ?? "Unknown",
      },
      game.id,
    );
  }

  return updated;
}

export async function makeMove(
  gameId: string,
  playerId: string,
  position: number,
) {
  const game = await prisma.minigame.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("GAME_NOT_FOUND");
  if (game.player1Id !== playerId && game.player2Id !== playerId) {
    throw new Error("NOT_A_PARTICIPANT");
  }
  if (game.status !== "ACTIVE") throw new Error("GAME_NOT_ACTIVE");
  if (game.currentTurnId !== playerId) throw new Error("NOT_YOUR_TURN");

  const isPlayer1 = game.player1Id === playerId;
  const playerSlot = isPlayer1 ? PLAYER1 : PLAYER2;
  const otherId = isPlayer1 ? game.player2Id : game.player1Id;

  let newState: TicTacToeState | ConnectFourState | KnuckleBonesState | null =
    null;
  let winner: string | null = null;
  let isDraw = false;

  if (game.type === "TIC_TAC_TOE") {
    const s = game.state as TicTacToeState;
    newState = applyTicTacToeMove(s, playerSlot, position);
    if (!newState) throw new Error("INVALID_MOVE");
    const result = checkTicTacToeResult(newState.board);
    winner = result.winner === playerSlot ? playerId : null;
    isDraw = result.isDraw;
  } else if (game.type === "CONNECT_FOUR") {
    const s = game.state as ConnectFourState;
    if (position < 0 || position >= COLS_CF) throw new Error("INVALID_MOVE");
    newState = applyConnectFourMove(s, playerSlot, position);
    if (!newState) throw new Error("INVALID_MOVE");
    const result = checkConnectFourResult(newState.board);
    winner = result.winner === playerSlot ? playerId : null;
    isDraw = result.isDraw;
  } else if (game.type === "KNUCKLEBONES") {
    const s = game.state as KnuckleBonesState;
    if (position < 0 || position > 2) throw new Error("INVALID_MOVE");
    newState = applyKnuckleMove(s, isPlayer1, position);
    if (!newState) throw new Error("INVALID_MOVE");
    // Game ends when the current player fills their grid
    const myGrid = isPlayer1 ? newState.player1Grid : newState.player2Grid;
    if (isKnuckleGridFull(myGrid)) {
      const p1Score = calcKnuckleScore(newState.player1Grid);
      const p2Score = calcKnuckleScore(newState.player2Grid);
      if (p1Score > p2Score) winner = game.player1Id;
      else if (p2Score > p1Score) winner = game.player2Id;
      else isDraw = true;
    }
  } else {
    throw new Error("UNKNOWN_GAME_TYPE");
  }

  const isGameOver = winner !== null || isDraw;
  const now = new Date();

  const updated = await prisma.minigame.update({
    where: { id: gameId },
    data: {
      state: newState as object,
      currentTurnId: isGameOver ? playerId : otherId,
      status: isGameOver ? "COMPLETED" : "ACTIVE",
      winnerId: winner,
      isDraw,
      completedAt: isGameOver ? now : undefined,
    },
    include: gameInclude,
  });

  if (isGameOver && game.conversationId) {
    const actor = await prisma.user.findUnique({
      where: { id: playerId },
      select: { username: true },
    });
    const messageType = isDraw ? "GAME_DRAW" : "GAME_WIN";
    await sendGameSystemMessage(
      game.conversationId,
      playerId,
      messageType,
      {
        gameId: game.id,
        gameType: game.type,
        winnerUsername: winner ? (actor?.username ?? "Unknown") : null,
      },
      game.id,
    );
  }

  return updated;
}
