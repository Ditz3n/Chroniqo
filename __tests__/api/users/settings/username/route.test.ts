/**
 * @jest-environment node
 */

// __tests__/api/users/settings/username/route.test.ts

/*
 * Tests for the username settings API route.
 * Covers the GET availability probe (free, self-owned, taken, too short)
 * and the PATCH change handler: successful change, no-op on unchanged
 * username, 30-day cooldown enforcement including boundary conditions,
 * conflict on taken username, and Zod validation for length and character
 * constraints.
 */

import { GET, PATCH } from "@/app/api/users/settings/username/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockUpdate.mockResolvedValue({});
});

describe("GET /api/users/settings/username - availability probe", () => {
  it("returns available: true when username is free", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = new Request(
      "http://localhost/api/users/settings/username?username=newname",
    );
    const res = await GET(req);
    const json = await res.json();
    expect(json.available).toBe(true);
  });

  it("returns available: true when the username already belongs to the requester", async () => {
    mockFindUnique.mockResolvedValue({ id: "user-1" });
    const req = new Request(
      "http://localhost/api/users/settings/username?username=myname",
    );
    const res = await GET(req);
    const json = await res.json();
    expect(json.available).toBe(true);
  });

  it("returns available: false when username belongs to someone else", async () => {
    mockFindUnique.mockResolvedValue({ id: "other-user" });
    const req = new Request(
      "http://localhost/api/users/settings/username?username=takenname",
    );
    const res = await GET(req);
    const json = await res.json();
    expect(json.available).toBe(false);
  });

  it("returns available: false for username shorter than 3 characters", async () => {
    const req = new Request(
      "http://localhost/api/users/settings/username?username=ab",
    );
    const res = await GET(req);
    const json = await res.json();
    expect(json.available).toBe(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const req = new Request(
      "http://localhost/api/users/settings/username?username=anyname",
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/users/settings/username - username change", () => {
  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/users/settings/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("successfully changes username when cooldown has not been used", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ username: "oldname", usernameChangedAt: null })
      .mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ username: "newname" }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "newname",
          usernameChangedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("returns 200 with no-op when username is unchanged", async () => {
    mockFindUnique.mockResolvedValueOnce({
      username: "samename",
      usernameChangedAt: null,
    });

    const res = await PATCH(makeRequest({ username: "samename" }));
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 429 with daysRemaining when cooldown is active", async () => {
    const changedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    mockFindUnique.mockResolvedValueOnce({
      username: "oldname",
      usernameChangedAt: changedAt,
    });

    const res = await PATCH(makeRequest({ username: "newname" }));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe("COOLDOWN");
    expect(json.daysRemaining).toBe(25);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 429 on the last day of cooldown (boundary)", async () => {
    const changedAt = new Date(Date.now() - (COOLDOWN_MS - 60 * 60 * 1000));
    mockFindUnique.mockResolvedValueOnce({
      username: "oldname",
      usernameChangedAt: changedAt,
    });

    const res = await PATCH(makeRequest({ username: "newname" }));
    expect(res.status).toBe(429);
  });

  it("allows change exactly when cooldown has elapsed", async () => {
    const changedAt = new Date(Date.now() - COOLDOWN_MS - 1000);
    mockFindUnique
      .mockResolvedValueOnce({
        username: "oldname",
        usernameChangedAt: changedAt,
      })
      .mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ username: "newname" }));
    expect(res.status).toBe(200);
  });

  it("returns 409 when desired username is taken by another user", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ username: "oldname", usernameChangedAt: null })
      .mockResolvedValueOnce({ id: "other-user" });

    const res = await PATCH(makeRequest({ username: "takenname" }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe("USERNAME_TAKEN");
  });

  it("returns 400 for username shorter than 3 characters", async () => {
    const res = await PATCH(makeRequest({ username: "ab" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for username longer than 30 characters", async () => {
    const res = await PATCH(makeRequest({ username: "a".repeat(31) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for username with illegal characters", async () => {
    const res = await PATCH(makeRequest({ username: "bad name!" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ username: "anyname" }));
    expect(res.status).toBe(401);
  });
});
