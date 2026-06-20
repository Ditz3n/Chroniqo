// __tests__/api/admin/users/username/mute/route.test.ts

/*
 * This file tests admin user-specific mute routes.
 * It covers reading active mute state, creating/updating mutes,
 * role and self-protection rules, and unmute deletion behavior.
 */

import { DELETE, GET, POST } from "@/app/api/admin/users/[username]/mute/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TEST_IDS } from "../../../../../utils/test-constants";
import {
  createMockSession,
  createMockUser,
} from "../../../../../utils/test-utils";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const MUTE_ID = "mute-1";
const TARGET_USERNAME = "targetuser";

const adminSession = createMockSession({ id: TEST_IDS.user, role: "ADMIN" });
const userSession = createMockSession({ id: TEST_IDS.user, role: "USER" });

const mockTargetUser = createMockUser({
  id: TEST_IDS.otherUser,
  username: TARGET_USERNAME,
  role: "USER",
});

const mockAdminTarget = createMockUser({
  id: TEST_IDS.otherUser,
  username: TARGET_USERNAME,
  role: "ADMIN",
});

const mockActiveMute = {
  id: MUTE_ID,
  userId: TEST_IDS.otherUser,
  reason: "Spam",
  expiresAt: new Date(Date.now() + 86400000), // tomorrow
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockExpiredMute = {
  ...mockActiveMute,
  expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
};

function makeParams(username: string) {
  return { params: Promise.resolve({ username }) };
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request(
    `http://localhost/api/admin/users/${TARGET_USERNAME}/mute`,
    {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(prisma));
  (prisma.notification.create as jest.Mock).mockResolvedValue({});
  (prisma.globalMute.upsert as jest.Mock).mockResolvedValue(mockActiveMute);
  (prisma.globalMute.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
  (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTargetUser);
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/admin/users/[username]/mute", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin session", async () => {
    (auth as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user does not exist", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    expect(res.status).toBe(404);
  });

  it("returns mute: null when no record exists", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mute).toBeNull();
  });

  it("returns mute: null for an expired mute record", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(
      mockExpiredMute,
    );
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mute).toBeNull();
  });

  it("returns the active mute record when mute is current", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(
      mockActiveMute,
    );
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mute).not.toBeNull();
    expect(body.mute.id).toBe(MUTE_ID);
  });

  it("returns active mute when expiresAt is null (permanent)", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      ...mockActiveMute,
      expiresAt: null,
    });
    const res = await GET(makeRequest("GET"), makeParams(TARGET_USERNAME));
    const body = await res.json();
    expect(body.mute).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe("POST /api/admin/users/[username]/mute", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await POST(
      makeRequest("POST", {}),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin session", async () => {
    (auth as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(
      makeRequest("POST", {}),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when user does not exist", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(
      makeRequest("POST", {}),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when admin tries to mute themselves", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    // Target has same id as the admin session user
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(
      createMockUser({ id: TEST_IDS.user, username: TARGET_USERNAME }),
    );
    const res = await POST(
      makeRequest("POST", {}),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when admin tries to mute another admin", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminTarget);
    const res = await POST(
      makeRequest("POST", {}),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and upserts a timed mute", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest("POST", { reason: "Spam", durationHours: 24 }),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.globalMute.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: TEST_IDS.otherUser } }),
    );
  });

  it("returns 200 and upserts a permanent mute when durationHours is null", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest("POST", { durationHours: null }),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(200);
    expect(prisma.globalMute.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ expiresAt: null }),
      }),
    );
  });

  it("sends a notification to the muted user inside the transaction", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    await POST(
      makeRequest("POST", { reason: "Test", durationHours: 48 }),
      makeParams(TARGET_USERNAME),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: TEST_IDS.otherUser }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/users/[username]/mute", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      makeRequest("DELETE"),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin session", async () => {
    (auth as jest.Mock).mockResolvedValue(userSession);
    const res = await DELETE(
      makeRequest("DELETE"),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when user does not exist", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      makeRequest("DELETE"),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 and deletes the mute record", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    const res = await DELETE(
      makeRequest("DELETE"),
      makeParams(TARGET_USERNAME),
    );
    expect(res.status).toBe(200);
    expect(prisma.globalMute.deleteMany).toHaveBeenCalledWith({
      where: { userId: TEST_IDS.otherUser },
    });
  });

  it("sends an unmute notification inside the transaction", async () => {
    (auth as jest.Mock).mockResolvedValue(adminSession);
    await DELETE(makeRequest("DELETE"), makeParams(TARGET_USERNAME));
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: TEST_IDS.otherUser }),
      }),
    );
  });
});
