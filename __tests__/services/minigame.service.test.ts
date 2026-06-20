// __tests__/services/minigame.service.test.ts

/*
 * Tests for the Minigame service.
 * Covers all three game types (TicTacToe, ConnectFour, Knucklebones),
 * game lifecycle transitions (create -> accept -> move -> complete),
 * win/draw detection, Knucklebones dice destruction logic,
 * and all error-path throws.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  acceptGame,
  calcKnuckleScore,
  cancelGame,
  createGame,
  getGame,
  makeMove,
} from "@/services/minigame.service";
import { ApiMinigamePlayer, KnuckleBonesState } from "@/types/app-types";
import { Conversation, Message, Minigame, PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import { TEST_IDS } from "../utils/test-constants";
import { createMockUser } from "../utils/test-utils";

jest.mock("@/lib/prisma");

const db = prismaMock as unknown as DeepMockProxy<PrismaClient>;

// Local type helpers

type MinigameWithRelations = Minigame & {
  player1: ApiMinigamePlayer;
  player2: ApiMinigamePlayer;
  winner: ApiMinigamePlayer | null;
};

// Test data constants

const P1 = TEST_IDS.user;
const P2 = TEST_IDS.otherUser;
const GAME_ID = "game-test-1";

const PLAYER1_STUB: ApiMinigamePlayer = {
  id: P1,
  username: "player1",
  name: null,
  image: null,
  avatarEmoji: null,
  avatarBgColor: null,
};

const PLAYER2_STUB: ApiMinigamePlayer = {
  id: P2,
  username: "player2",
  name: null,
  image: null,
  avatarEmoji: null,
  avatarBgColor: null,
};

// Factory helpers

/**
 * Returns a fully-typed Conversation with participants.
 * Used for prisma.conversation.findUnique mocks (which the service calls
 * with include: { participants: { select: { userId } } }).
 */
function mkConversation(
  participantIds: string[],
  overrides: Partial<Conversation> = {},
): Conversation & { participants: { userId: string }[] } {
  return {
    isDummy: false,
    id: TEST_IDS.conversation,
    name: null,
    image: null,
    avatarEmoji: null,
    avatarBgColor: null,
    durationHours: 24,
    expiresAt: new Date(Date.now() + 86_400_000),
    deletedByUserId: null,
    deletionScheduledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isCommunity: false,
    communityId: null,
    participants: participantIds.map((userId) => ({ userId })),
    ...overrides,
  };
}

/**
 * Returns a fully-typed Minigame (scalar fields only - no relations).
 * Use for prisma.minigame.findUnique / findFirst mocks.
 */
function mkMinigame(overrides: Partial<Minigame> = {}): Minigame {
  return {
    id: GAME_ID,
    type: "TIC_TAC_TOE",
    mode: "ASYNC",
    status: "ACTIVE",
    player1Id: P1,
    player2Id: P2,
    currentTurnId: P1,
    winnerId: null,
    isDraw: false,
    // JSON field: TypeScript accepts the object literal via structural typing
    state: {
      board: [null, null, null, null, null, null, null, null, null],
    } as Minigame["state"],
    conversationId: TEST_IDS.conversation,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Returns a Minigame with joined player relations (gameInclude shape).
 * Use for prisma.minigame.create / update mocks.
 */
function mkGame(
  overrides: Partial<MinigameWithRelations> = {},
): MinigameWithRelations {
  return {
    ...mkMinigame(),
    player1: PLAYER1_STUB,
    player2: PLAYER2_STUB,
    winner: null,
    ...overrides,
  };
}

/** Returns a fully-typed Message. */
function mkMsg(overrides: Partial<Message> = {}): Message {
  return {
    isDummy: false,
    id: TEST_IDS.message,
    conversationId: TEST_IDS.conversation,
    senderId: P1,
    content: "{}",
    isSystem: true,
    messageType: "GAME_CHALLENGE",
    replyToId: null,
    dailyStatusId: null,
    createdAt: new Date(),
    deletedAt: null,
    isAnonymous: false,
    minigameId: GAME_ID,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// calcKnuckleScore - pure function

describe("calcKnuckleScore", () => {
  it("returns 0 for an empty grid", () => {
    const grid: (number | null)[][] = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    expect(calcKnuckleScore(grid)).toBe(0);
  });

  it("scores a single die: count¹ × value", () => {
    // One 4 in col 0 → 1×1×4 = 4
    const grid: (number | null)[][] = [
      [4, null, null],
      [null, null, null],
      [null, null, null],
    ];
    expect(calcKnuckleScore(grid)).toBe(4);
  });

  it("scores a triple match: count² × value", () => {
    // Three 3s in col 0 → 3×3×3 = 27
    const grid: (number | null)[][] = [
      [3, 3, 3],
      [null, null, null],
      [null, null, null],
    ];
    expect(calcKnuckleScore(grid)).toBe(27);
  });

  it("scores a pair + singleton in the same column", () => {
    // Two 2s + one 5 → (2×2×2) + (1×1×5) = 13
    const grid: (number | null)[][] = [
      [2, 2, 5],
      [null, null, null],
      [null, null, null],
    ];
    expect(calcKnuckleScore(grid)).toBe(13);
  });

  it("sums scores across all three columns", () => {
    // Col 0: [6] = 6, Col 1: [6,6] = 24, Col 2: [6,6,6] = 54
    const grid: (number | null)[][] = [
      [6, null, null],
      [6, 6, null],
      [6, 6, 6],
    ];
    expect(calcKnuckleScore(grid)).toBe(84);
  });
});

// createGame

describe("createGame", () => {
  const dto = {
    type: "TIC_TAC_TOE" as const,
    mode: "ASYNC" as const,
    opponentId: P2,
    conversationId: TEST_IDS.conversation,
  };

  it("creates a PENDING game and posts a GAME_CHALLENGE system message", async () => {
    db.conversation.findUnique.mockResolvedValue(mkConversation([P1, P2]));
    db.minigame.findFirst.mockResolvedValue(null);
    const newGame = mkGame({ status: "PENDING" });
    db.minigame.create.mockResolvedValue(newGame);
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(mkMsg());

    const result = await createGame(dto, P1);

    expect(db.minigame.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "TIC_TAC_TOE",
          status: "PENDING",
          player1Id: P1,
          player2Id: P2,
        }),
      }),
    );
    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isSystem: true,
          messageType: "GAME_CHALLENGE",
          minigameId: newGame.id,
        }),
      }),
    );
    expect(result).toEqual(newGame);
  });

  it("throws COMMUNITY_CHAT_NOT_ALLOWED for community chats", async () => {
    db.conversation.findUnique.mockResolvedValue(
      mkConversation([P1, P2], { isCommunity: true }),
    );

    await expect(createGame(dto, P1)).rejects.toThrow(
      "COMMUNITY_CHAT_NOT_ALLOWED",
    );
  });

  it("throws NOT_A_DIRECT_CHAT when the conversation has more than 2 participants", async () => {
    db.conversation.findUnique.mockResolvedValue(
      mkConversation([P1, P2, "third-user"]),
    );

    await expect(createGame(dto, P1)).rejects.toThrow("NOT_A_DIRECT_CHAT");
  });

  it("throws OPPONENT_NOT_IN_CHAT when the opponent is not a participant", async () => {
    db.conversation.findUnique.mockResolvedValue(
      mkConversation([P1, "someone-else"]),
    );

    await expect(createGame(dto, P1)).rejects.toThrow("OPPONENT_NOT_IN_CHAT");
  });

  it("throws GAME_ALREADY_ACTIVE when an active game of the same type exists", async () => {
    db.conversation.findUnique.mockResolvedValue(mkConversation([P1, P2]));
    db.minigame.findFirst.mockResolvedValue(mkMinigame());

    await expect(createGame(dto, P1)).rejects.toThrow("GAME_ALREADY_ACTIVE");
  });
});

// getGame

describe("getGame", () => {
  it("returns the game for a participant", async () => {
    const game = mkGame();
    db.minigame.findUnique.mockResolvedValue(game);

    const result = await getGame(GAME_ID, P1);
    expect(result).toEqual(game);
  });

  it("throws GAME_NOT_FOUND when the game does not exist", async () => {
    db.minigame.findUnique.mockResolvedValue(null);
    await expect(getGame(GAME_ID, P1)).rejects.toThrow("GAME_NOT_FOUND");
  });

  it("throws NOT_A_PARTICIPANT for a non-participant", async () => {
    db.minigame.findUnique.mockResolvedValue(mkGame());
    await expect(getGame(GAME_ID, "stranger")).rejects.toThrow(
      "NOT_A_PARTICIPANT",
    );
  });
});

// acceptGame

describe("acceptGame", () => {
  it("transitions to ACTIVE and assigns first turn to player2 (the challenged player)", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame({ status: "PENDING" }));
    const updated = mkGame({ status: "ACTIVE", currentTurnId: P2 });
    db.minigame.update.mockResolvedValue(updated);
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player2" }),
    );
    db.message.create.mockResolvedValue(
      mkMsg({ messageType: "GAME_ACCEPTED" }),
    );

    const result = await acceptGame(GAME_ID, P2);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          currentTurnId: P2,
        }),
      }),
    );
    expect(result).toEqual(updated);
  });

  it("throws NOT_THE_CHALLENGED_PLAYER when player1 tries to accept", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame({ status: "PENDING" }));
    await expect(acceptGame(GAME_ID, P1)).rejects.toThrow(
      "NOT_THE_CHALLENGED_PLAYER",
    );
  });

  it("throws GAME_NOT_PENDING when the game is already active", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame({ status: "ACTIVE" }));
    await expect(acceptGame(GAME_ID, P2)).rejects.toThrow("GAME_NOT_PENDING");
  });
});

// cancelGame

describe("cancelGame", () => {
  it("sets CANCELLED and assigns winner to other player when initiator abandons an active game", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame());
    db.minigame.update.mockResolvedValue(mkGame({ status: "CANCELLED" }));
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(
      mkMsg({ messageType: "GAME_CANCELLED" }),
    );

    await cancelGame(GAME_ID, P1);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CANCELLED",
          winnerId: P2, // P2 wins because P1 forfeited
        }),
      }),
    );
    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ messageType: "GAME_CANCELLED" }),
      }),
    );
  });

  it("sets DECLINED when the challenged player rejects a PENDING game", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame({ status: "PENDING" }));
    db.minigame.update.mockResolvedValue(mkGame({ status: "DECLINED" }));
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player2" }),
    );
    db.message.create.mockResolvedValue(
      mkMsg({ messageType: "GAME_DECLINED" }),
    );

    await cancelGame(GAME_ID, P2);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DECLINED" }),
      }),
    );
    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ messageType: "GAME_DECLINED" }),
      }),
    );
  });

  it("throws GAME_ALREADY_ENDED for a completed game", async () => {
    db.minigame.findUnique.mockResolvedValue(
      mkMinigame({ status: "COMPLETED" }),
    );
    await expect(cancelGame(GAME_ID, P1)).rejects.toThrow("GAME_ALREADY_ENDED");
  });
});

// makeMove - TicTacToe

describe("makeMove - TicTacToe", () => {
  it("applies a valid move and keeps the game ACTIVE", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame());
    db.minigame.update.mockResolvedValue(mkGame({ currentTurnId: P2 }));

    await makeMove(GAME_ID, P1, 0);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          currentTurnId: P2,
          winnerId: null,
          isDraw: false,
        }),
      }),
    );
  });

  it("detects a winning move on the top row and sets COMPLETED", async () => {
    const board: (string | null)[] = [
      "PLAYER1",
      "PLAYER1",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    db.minigame.findUnique.mockResolvedValue(
      mkMinigame({ state: { board } as Minigame["state"] }),
    );
    db.minigame.update.mockResolvedValue(
      mkGame({ status: "COMPLETED", winnerId: P1 }),
    );
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(mkMsg({ messageType: "GAME_WIN" }));

    await makeMove(GAME_ID, P1, 2);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          winnerId: P1,
          isDraw: false,
        }),
      }),
    );
    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ messageType: "GAME_WIN" }),
      }),
    );
  });

  it("detects a draw when the board is full with no winner", async () => {
    const board: (string | null)[] = [
      "PLAYER1",
      "PLAYER2",
      "PLAYER1",
      "PLAYER1",
      "PLAYER2",
      "PLAYER2",
      "PLAYER2",
      "PLAYER1",
      null,
    ];
    db.minigame.findUnique.mockResolvedValue(
      mkMinigame({ state: { board } as Minigame["state"] }),
    );
    db.minigame.update.mockResolvedValue(
      mkGame({ status: "COMPLETED", isDraw: true }),
    );
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(mkMsg({ messageType: "GAME_DRAW" }));

    await makeMove(GAME_ID, P1, 8);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDraw: true, winnerId: null }),
      }),
    );
    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ messageType: "GAME_DRAW" }),
      }),
    );
  });

  it("throws INVALID_MOVE when the cell is already occupied", async () => {
    const board: (string | null)[] = [
      "PLAYER1",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    db.minigame.findUnique.mockResolvedValue(
      mkMinigame({ state: { board } as Minigame["state"] }),
    );

    await expect(makeMove(GAME_ID, P1, 0)).rejects.toThrow("INVALID_MOVE");
  });

  it("throws NOT_YOUR_TURN when the wrong player moves", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame({ currentTurnId: P2 }));
    await expect(makeMove(GAME_ID, P1, 0)).rejects.toThrow("NOT_YOUR_TURN");
  });

  it("throws GAME_NOT_ACTIVE for a PENDING game", async () => {
    db.minigame.findUnique.mockResolvedValue(mkMinigame({ status: "PENDING" }));
    await expect(makeMove(GAME_ID, P1, 0)).rejects.toThrow("GAME_NOT_ACTIVE");
  });
});

// makeMove - ConnectFour

describe("makeMove - ConnectFour", () => {
  function emptyCFBoard(): (string | null)[][] {
    return Array.from({ length: 7 }, () => Array<string | null>(6).fill(null));
  }

  function mkCFMinigame(overrides: Partial<Minigame> = {}): Minigame {
    return mkMinigame({
      type: "CONNECT_FOUR",
      state: { board: emptyCFBoard() } as Minigame["state"],
      ...overrides,
    });
  }

  function mkCFGame(
    overrides: Partial<MinigameWithRelations> = {},
  ): MinigameWithRelations {
    return mkGame({
      type: "CONNECT_FOUR",
      state: { board: emptyCFBoard() } as Minigame["state"],
      ...overrides,
    });
  }

  it("places the disc at the bottom row via gravity (row 0)", async () => {
    db.minigame.findUnique.mockResolvedValue(mkCFMinigame());
    db.minigame.update.mockResolvedValue(mkCFGame());

    await makeMove(GAME_ID, P1, 0);

    const updateArg = db.minigame.update.mock.calls[0][0] as unknown as {
      data: { state: { board: (string | null)[][] }; currentTurnId: string };
    };
    expect(updateArg.data.state.board[0][0]).toBe("PLAYER1");
    expect(updateArg.data.currentTurnId).toBe(P2);
  });

  it("stacks a second disc on top of an existing one in the same column", async () => {
    const board = emptyCFBoard();
    board[0][0] = "PLAYER2";

    db.minigame.findUnique.mockResolvedValue(
      mkCFMinigame({ state: { board } as Minigame["state"] }),
    );
    db.minigame.update.mockResolvedValue(mkCFGame());

    await makeMove(GAME_ID, P1, 0);

    const updateArg = db.minigame.update.mock.calls[0][0] as unknown as {
      data: { state: { board: (string | null)[][] } };
    };
    expect(updateArg.data.state.board[0][1]).toBe("PLAYER1");
  });

  it("throws INVALID_MOVE when the target column is full", async () => {
    const board = emptyCFBoard();
    board[0] = Array<string>(6).fill("PLAYER1");

    db.minigame.findUnique.mockResolvedValue(
      mkCFMinigame({ state: { board } as Minigame["state"] }),
    );

    await expect(makeMove(GAME_ID, P1, 0)).rejects.toThrow("INVALID_MOVE");
  });

  it("detects a horizontal win and marks the game COMPLETED", async () => {
    const board = emptyCFBoard();
    board[0][0] = "PLAYER1";
    board[1][0] = "PLAYER1";
    board[2][0] = "PLAYER1";

    db.minigame.findUnique.mockResolvedValue(
      mkCFMinigame({ state: { board } as Minigame["state"] }),
    );
    db.minigame.update.mockResolvedValue(
      mkCFGame({ status: "COMPLETED", winnerId: P1 }),
    );
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(mkMsg({ messageType: "GAME_WIN" }));

    await makeMove(GAME_ID, P1, 3);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", winnerId: P1 }),
      }),
    );
  });

  it("detects a vertical win", async () => {
    const board = emptyCFBoard();
    board[0][0] = "PLAYER1";
    board[0][1] = "PLAYER1";
    board[0][2] = "PLAYER1";

    db.minigame.findUnique.mockResolvedValue(
      mkCFMinigame({ state: { board } as Minigame["state"] }),
    );
    db.minigame.update.mockResolvedValue(
      mkCFGame({ status: "COMPLETED", winnerId: P1 }),
    );
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(mkMsg({ messageType: "GAME_WIN" }));

    await makeMove(GAME_ID, P1, 0);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", winnerId: P1 }),
      }),
    );
  });
});

// makeMove - Knucklebones

describe("makeMove - Knucklebones", () => {
  function emptyKBGrid(): (number | null)[][] {
    return Array.from(
      { length: 3 },
      () => [null, null, null] as (number | null)[],
    );
  }

  function mkKBMinigame(stateOverride?: Partial<KnuckleBonesState>): Minigame {
    const state: KnuckleBonesState = {
      player1Grid: emptyKBGrid(),
      player2Grid: emptyKBGrid(),
      pendingRoll: 4,
      ...stateOverride,
    };
    return mkMinigame({
      type: "KNUCKLEBONES",
      state: state as Minigame["state"],
    });
  }

  it("places the pending die at the bottom row of the chosen column", async () => {
    db.minigame.findUnique.mockResolvedValue(mkKBMinigame());
    db.minigame.update.mockResolvedValue(mkGame({ type: "KNUCKLEBONES" }));

    await makeMove(GAME_ID, P1, 1);

    const updateArg = db.minigame.update.mock.calls[0][0] as unknown as {
      data: { state: KnuckleBonesState; currentTurnId: string };
    };
    // Die value 4 should land in column 1, row 0 (bottom)
    expect(updateArg.data.state.player1Grid[1][0]).toBe(4);
    // Turn passes to player2
    expect(updateArg.data.currentTurnId).toBe(P2);
  });

  it("destroys matching opponent dice in the same column", async () => {
    db.minigame.findUnique.mockResolvedValue(
      mkKBMinigame({
        player2Grid: [
          [4, null, null],
          [null, null, null],
          [null, null, null],
        ],
        pendingRoll: 4, // P1 places a 4 in col 0 - should destroy P2's 4
      }),
    );
    db.minigame.update.mockResolvedValue(mkGame({ type: "KNUCKLEBONES" }));

    await makeMove(GAME_ID, P1, 0);

    const updateArg = db.minigame.update.mock.calls[0][0] as unknown as {
      data: { state: KnuckleBonesState };
    };
    // P2's 4 in col 0 must be nulled out
    expect(updateArg.data.state.player2Grid[0][0]).toBeNull();
    // P1's 4 must be placed
    expect(updateArg.data.state.player1Grid[0][0]).toBe(4);
  });

  it("does NOT destroy opponent dice with a different value", async () => {
    db.minigame.findUnique.mockResolvedValue(
      mkKBMinigame({
        player2Grid: [
          [2, null, null],
          [null, null, null],
          [null, null, null],
        ],
        pendingRoll: 4, // different value - should leave P2's 2 intact
      }),
    );
    db.minigame.update.mockResolvedValue(mkGame({ type: "KNUCKLEBONES" }));

    await makeMove(GAME_ID, P1, 0);

    const updateArg = db.minigame.update.mock.calls[0][0] as unknown as {
      data: { state: KnuckleBonesState };
    };
    expect(updateArg.data.state.player2Grid[0][0]).toBe(2);
  });

  it("throws INVALID_MOVE when the chosen column is full", async () => {
    db.minigame.findUnique.mockResolvedValue(
      mkKBMinigame({
        player1Grid: [
          [3, 3, 3],
          [null, null, null],
          [null, null, null],
        ],
        pendingRoll: 2,
      }),
    );

    await expect(makeMove(GAME_ID, P1, 0)).rejects.toThrow("INVALID_MOVE");
  });

  it("marks the game COMPLETED when the current player fills their grid", async () => {
    db.minigame.findUnique.mockResolvedValue(
      mkKBMinigame({
        player1Grid: [
          [6, 6, 6],
          [6, 6, 6],
          [6, 6, null],
        ], // one slot left
        player2Grid: [
          [1, null, null],
          [null, null, null],
          [null, null, null],
        ],
        pendingRoll: 6,
      }),
    );
    db.minigame.update.mockResolvedValue(
      mkGame({ type: "KNUCKLEBONES", status: "COMPLETED", winnerId: P1 }),
    );
    db.user.findUnique.mockResolvedValue(
      createMockUser({ username: "player1" }),
    );
    db.message.create.mockResolvedValue(mkMsg({ messageType: "GAME_WIN" }));

    await makeMove(GAME_ID, P1, 2);

    expect(db.minigame.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });
});
