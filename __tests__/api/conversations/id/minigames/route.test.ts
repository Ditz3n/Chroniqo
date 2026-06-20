/**
 * @jest-environment node
 */

// __tests__/api/conversations/id/minigames/route.test.ts

/*
 * Tests for GET /api/conversations/[id]/minigames
 * (list PENDING + ACTIVE games for a conversation).
 */

import { GET } from "@/app/api/conversations/[id]/minigames/route";
import { getConversationActiveGames } from "@/services/minigame.service";
import { TEST_IDS } from "../../../../utils/test-constants";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/minigame.service");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockGetGames = getConversationActiveGames as jest.Mock;
const BASE = "http://localhost";
const CONV_ID = TEST_IDS.conversation;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: TEST_IDS.user } });
});

function makeReq() {
  return new Request(`${BASE}/api/conversations/${CONV_ID}/minigames`);
}

function makeParams() {
  return { params: Promise.resolve({ id: CONV_ID }) };
}

describe("GET /api/conversations/[id]/minigames", () => {
  it("returns 200 with the active games list", async () => {
    const games = [
      { id: "game-1", type: "TIC_TAC_TOE", status: "ACTIVE" },
      { id: "game-2", type: "KNUCKLEBONES", status: "PENDING" },
    ];
    mockGetGames.mockResolvedValue(games);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.games).toEqual(games);
    expect(mockGetGames).toHaveBeenCalledWith(CONV_ID, TEST_IDS.user);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not a participant", async () => {
    mockGetGames.mockRejectedValue(new Error("NOT_A_PARTICIPANT"));
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns an empty array when there are no active games", async () => {
    mockGetGames.mockResolvedValue([]);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.games).toEqual([]);
  });
});
