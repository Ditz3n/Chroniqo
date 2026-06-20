/**
 * @jest-environment node
 */

// __tests__/api/minigames/id/route.test.ts

/*
 * Tests for GET /api/minigames/[id] (fetch a single game's state).
 */

import { GET } from "@/app/api/minigames/[id]/route";
import { getGame } from "@/services/minigame.service";
import { TEST_IDS } from "../../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockGetGame = getGame as jest.Mock;
const BASE = "http://localhost";
const GAME_ID = "game-test-1";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq() {
  return new Request(`${BASE}/api/minigames/${GAME_ID}`);
}

function makeParams() {
  return { params: Promise.resolve({ id: GAME_ID }) };
}

describe("GET /api/minigames/[id]", () => {
  it("returns 200 with the game on success", async () => {
    const game = { id: GAME_ID, type: "TIC_TAC_TOE", status: "ACTIVE" };
    mockGetGame.mockResolvedValue(game);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.game).toEqual(game);
    expect(mockGetGame).toHaveBeenCalledWith(GAME_ID, TEST_IDS.user);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when the game does not exist", async () => {
    mockGetGame.mockRejectedValue(new Error("GAME_NOT_FOUND"));
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 403 when the requester is not a participant", async () => {
    mockGetGame.mockRejectedValue(new Error("NOT_A_PARTICIPANT"));
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });
});
