/**
 * @jest-environment node
 */

// __tests__/api/minigames/id/accept/route.test.ts

/*
 * Tests for POST /api/minigames/[id]/accept (accept a pending game).
 * These tests focus on the API route's behavior and error handling,
 * not the underlying service logic, which is covered in unit tests for minigame.service.
 */

import { POST } from "@/app/api/minigames/[id]/accept/route";
import { acceptGame } from "@/services/minigame.service";
import { TEST_IDS } from "../../../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockAcceptGame = acceptGame as jest.Mock;
const BASE = "http://localhost";
const GAME_ID = "game-test-1";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq() {
  return new Request(`${BASE}/api/minigames/${GAME_ID}/accept`, {
    method: "POST",
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: GAME_ID }) };
}

describe("POST /api/minigames/[id]/accept", () => {
  it("returns 200 with the updated game when accepted", async () => {
    const game = { id: GAME_ID, status: "ACTIVE" };
    mockAcceptGame.mockResolvedValue(game);

    const res = await POST(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.game).toEqual(game);
    expect(mockAcceptGame).toHaveBeenCalledWith(GAME_ID, TEST_IDS.user);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not the challenged player", async () => {
    mockAcceptGame.mockRejectedValue(new Error("NOT_THE_CHALLENGED_PLAYER"));
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 409 when the game is not in PENDING state", async () => {
    mockAcceptGame.mockRejectedValue(new Error("GAME_NOT_PENDING"));
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
  });

  it("returns 404 when the game does not exist", async () => {
    mockAcceptGame.mockRejectedValue(new Error("GAME_NOT_FOUND"));
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });
});
