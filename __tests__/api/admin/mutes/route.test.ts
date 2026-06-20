// __tests__/api/admin/mutes/route.test.ts

/*
 * This file tests the admin mutes API routes.
 * It verifies access control (admin vs non-admin), active mute listing,
 * mute extension behavior (timed and permanent), and mute deletion by id.
 */

import { DELETE, GET, PATCH } from "@/app/api/admin/mutes/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TEST_IDS } from "../../../utils/test-constants";
import { createMockSession } from "../../../utils/test-utils";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const MUTE_ID = "mute-1";
const adminSession = createMockSession({ id: TEST_IDS.user, role: "ADMIN" });
const userSession = createMockSession({ id: TEST_IDS.user, role: "USER" });

const mockMute = {
  id: MUTE_ID,
  userId: TEST_IDS.otherUser,
  reason: "Harassment",
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    username: "targetuser",
    name: "Target",
    image: null,
    email: "t@test.com",
  },
};

function makeRequest(method: string, body?: unknown, search?: string): Request {
  const url = `http://localhost/api/admin/mutes${search ?? ""}`;
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.globalMute.findMany as jest.Mock).mockResolvedValue([mockMute]);
  (prisma.globalMute.update as jest.Mock).mockResolvedValue(mockMute);
  (prisma.globalMute.delete as jest.Mock).mockResolvedValue(mockMute);
});

// GET

describe("GET /api/admin/mutes", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin session", async () => {
    (auth as jest.Mock).mockResolvedValue(userSession);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with active mutes list", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mutes).toHaveLength(1);
    expect(body.mutes[0].id).toBe(MUTE_ID);
  });

  it("queries only active mutes (expiresAt null or future)", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    await GET();
    expect(prisma.globalMute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });

  it("returns an empty array when no active mutes exist", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.globalMute.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.mutes).toHaveLength(0);
  });
});

// PATCH

describe("PATCH /api/admin/mutes", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("PATCH", { id: MUTE_ID, durationHours: 24 }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makeRequest("PATCH", { durationHours: 24 })); // missing id
    expect(res.status).toBe(400);
  });

  it("returns 200 and updates expiresAt for timed extension", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(
      makeRequest("PATCH", { id: MUTE_ID, durationHours: 168 }),
    );
    expect(res.status).toBe(200);
    expect(prisma.globalMute.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MUTE_ID } }),
    );
  });

  it("sets expiresAt to null for permanent extension", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    await PATCH(makeRequest("PATCH", { id: MUTE_ID, durationHours: null }));
    expect(prisma.globalMute.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt: null }),
      }),
    );
  });
});

// DELETE

describe("DELETE /api/admin/mutes", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      makeRequest("DELETE", undefined, `?id=${MUTE_ID}`),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when id query param is missing", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await DELETE(makeRequest("DELETE")); // no ?id=
    expect(res.status).toBe(400);
  });

  it("returns 200 and deletes the mute by id", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await DELETE(
      makeRequest("DELETE", undefined, `?id=${MUTE_ID}`),
    );
    expect(res.status).toBe(200);
    expect(prisma.globalMute.delete).toHaveBeenCalledWith({
      where: { id: MUTE_ID },
    });
  });
});
