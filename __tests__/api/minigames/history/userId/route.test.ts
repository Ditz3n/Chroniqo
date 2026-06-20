/**
 * @jest-environment node
 */

// __tests__/api/minigames/history/userId/route.test.ts

/*
 * Tests for GET /api/minigames/history/[userId]
 * (completed game history between the caller and a specific opponent).
 */

import { GET } from "@/app/api/minigames/history/[userId]/route";
import { getGameHistory } from "@/services/minigame.service";
import { TEST_IDS } from "../../../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockGetHistory = getGameHistory as jest.Mock;
const BASE = "http://localhost";
const OPPONENT_ID = TEST_IDS.otherUser;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq() {
  return new Request(`${BASE}/api/minigames/history/${OPPONENT_ID}`);
}

function makeParams() {
  return { params: Promise.resolve({ userId: OPPONENT_ID }) };
}

describe("GET /api/minigames/history/[userId]", () => {
  it("returns 200 with the history list", async () => {
    const games = [
      {
        id: "game-old-1",
        type: "TIC_TAC_TOE",
        status: "COMPLETED",
        winnerId: TEST_IDS.user,
      },
    ];
    mockGetHistory.mockResolvedValue(games);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.games).toEqual(games);
    expect(mockGetHistory).toHaveBeenCalledWith(TEST_IDS.user, OPPONENT_ID);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns an empty array when no games have been played against this opponent", async () => {
    mockGetHistory.mockResolvedValue([]);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.games).toEqual([]);
  });

  it("returns 500 on unexpected service error", async () => {
    mockGetHistory.mockRejectedValue(new Error("DB connection lost"));
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(500);
  });
});
