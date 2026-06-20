// __tests__/api/user/mute-status.test.ts

/*
 * This file tests the user mute-status API route.
 * It validates unauthenticated handling plus active, expired, and
 * permanent mute responses while asserting minimal data selection.
 */

import { GET } from "@/app/api/user/mute-status/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TEST_IDS } from "../../utils/test-constants";
import { createMockSession } from "../../utils/test-utils";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const session = createMockSession({ id: TEST_IDS.user });

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(null);
});

describe("GET /api/user/mute-status", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns isMuted: false when no mute record exists", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.isMuted).toBe(false);
    expect(body.expiresAt).toBeNull();
  });

  it("returns isMuted: true for a permanent mute (expiresAt null)", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.isMuted).toBe(true);
    expect(body.expiresAt).toBeNull();
  });

  it("returns isMuted: true for an active timed mute", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    const future = new Date(Date.now() + 3600000);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: future,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.isMuted).toBe(true);
    expect(body.expiresAt).toBe(future.toISOString());
  });

  it("returns isMuted: false for an expired mute record", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });
    const res = await GET();
    const body = await res.json();
    expect(body.isMuted).toBe(false);
    expect(body.expiresAt).toBeNull();
  });

  it("only fetches expiresAt - no unnecessary data selected", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    await GET();
    expect(prisma.globalMute.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_IDS.user },
        select: { expiresAt: true },
      }),
    );
  });
});
