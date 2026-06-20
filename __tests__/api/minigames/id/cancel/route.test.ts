/**
 * @jest-environment node
 */

// __tests__/api/minigames/id/cancel/route.test.ts

/*
 * Tests for POST /api/minigames/[id]/cancel (cancel a pending game).
 * These tests focus on the API route's behavior and error handling,
 * not the underlying service logic, which is covered in unit tests for minigame.service.
 */

import { POST } from "@/app/api/minigames/[id]/cancel/route";
import { cancelGame } from "@/services/minigame.service";
import { TEST_IDS } from "../../../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockCancelGame = cancelGame as jest.Mock;
const BASE = "http://localhost";
const GAME_ID = "game-test-1";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq() {
  return new Request(`${BASE}/api/minigames/${GAME_ID}/cancel`, {
    method: "POST",
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: GAME_ID }) };
}

describe("POST /api/minigames/[id]/cancel", () => {
  it("returns 200 with the cancelled game on success", async () => {
    const game = { id: GAME_ID, status: "CANCELLED" };
    mockCancelGame.mockResolvedValue(game);

    const res = await POST(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.game).toEqual(game);
    expect(mockCancelGame).toHaveBeenCalledWith(GAME_ID, TEST_IDS.user);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not a participant", async () => {
    mockCancelGame.mockRejectedValue(new Error("NOT_A_PARTICIPANT"));
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 409 when the game has already ended", async () => {
    mockCancelGame.mockRejectedValue(new Error("GAME_ALREADY_ENDED"));
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
  });

  it("returns 404 when the game does not exist", async () => {
    mockCancelGame.mockRejectedValue(new Error("GAME_NOT_FOUND"));
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });
});
