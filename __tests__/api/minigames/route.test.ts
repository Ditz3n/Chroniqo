/**
 * @jest-environment node
 */

// __tests__/api/minigames/route.test.ts

/*
 * Tests for POST /api/minigames (create a new minigame challenge).
 * Covers authentication guard, Zod validation, service success path,
 * and every service error code mapped to its correct HTTP status.
 */

import { POST } from "@/app/api/minigames/route";
import { createGame } from "@/services/minigame.service";
import { TEST_IDS } from "../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockCreateGame = createGame as jest.Mock;
const BASE = "http://localhost";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq(body: unknown) {
  return new Request(`${BASE}/api/minigames`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  type: "TIC_TAC_TOE",
  mode: "ASYNC",
  opponentId: TEST_IDS.otherUser,
  conversationId: TEST_IDS.conversation,
};

describe("POST /api/minigames", () => {
  it("returns 201 with the created game on success", async () => {
    const game = { id: "game-1", type: "TIC_TAC_TOE" };
    mockCreateGame.mockResolvedValue(game);

    const res = await POST(makeReq(VALID_BODY));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.game).toEqual(game);
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TIC_TAC_TOE" }),
      TEST_IDS.user,
    );
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 422 when the game type is invalid", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, type: "CHESS" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when the opponentId is missing", async () => {
    const body = {
      type: "TIC_TAC_TOE",
      mode: "ASYNC",
      conversationId: TEST_IDS.conversation,
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(422);
  });

  it("returns 403 for community chats", async () => {
    mockCreateGame.mockRejectedValue(new Error("COMMUNITY_CHAT_NOT_ALLOWED"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 403 when the conversation is not a direct chat", async () => {
    mockCreateGame.mockRejectedValue(new Error("NOT_A_DIRECT_CHAT"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the conversation does not exist", async () => {
    mockCreateGame.mockRejectedValue(new Error("CONVERSATION_NOT_FOUND"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 409 when an active game of the same type already exists", async () => {
    mockCreateGame.mockRejectedValue(new Error("GAME_ALREADY_ACTIVE"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(409);
  });
});
