/**
 * @jest-environment node
 */

// __tests__/api/minigames/id/move/route.test.ts

/*
 * Tests for POST /api/minigames/[id]/move.
 * Verifies auth, Zod validation on position, and all service error codes.
 */

import { POST } from "@/app/api/minigames/[id]/move/route";
import { makeMove } from "@/services/minigame.service";
import { TEST_IDS } from "../../../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockMakeMove = makeMove as jest.Mock;
const BASE = "http://localhost";
const GAME_ID = "game-test-1";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq(body: unknown) {
  return new Request(`${BASE}/api/minigames/${GAME_ID}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: GAME_ID }) };
}

describe("POST /api/minigames/[id]/move", () => {
  it("returns 200 with the updated game on a valid move", async () => {
    const game = { id: GAME_ID, status: "ACTIVE" };
    mockMakeMove.mockResolvedValue(game);

    const res = await POST(makeReq({ position: 4 }), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.game).toEqual(game);
    expect(mockMakeMove).toHaveBeenCalledWith(GAME_ID, TEST_IDS.user, 4);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq({ position: 0 }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 422 when position is missing", async () => {
    const res = await POST(makeReq({}), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 422 when position is out of range", async () => {
    const res = await POST(makeReq({ position: 99 }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when the game does not exist", async () => {
    mockMakeMove.mockRejectedValue(new Error("GAME_NOT_FOUND"));
    const res = await POST(makeReq({ position: 0 }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 409 when it is not the player's turn", async () => {
    mockMakeMove.mockRejectedValue(new Error("NOT_YOUR_TURN"));
    const res = await POST(makeReq({ position: 0 }), makeParams());
    expect(res.status).toBe(409);
  });

  it("returns 409 when the game is not in ACTIVE state", async () => {
    mockMakeMove.mockRejectedValue(new Error("GAME_NOT_ACTIVE"));
    const res = await POST(makeReq({ position: 0 }), makeParams());
    expect(res.status).toBe(409);
  });

  it("returns 422 when the move is invalid (occupied cell / full column)", async () => {
    mockMakeMove.mockRejectedValue(new Error("INVALID_MOVE"));
    const res = await POST(makeReq({ position: 0 }), makeParams());
    expect(res.status).toBe(422);
  });
});
