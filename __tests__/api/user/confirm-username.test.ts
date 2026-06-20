/**
 * @jest-environment node
 */

// __tests__/api/user/confirm-username.test.ts

/*
 * Tests for the confirm-username route.
 * GET: validates the token.
 * POST: accepts the token and the chosen new username, checks availability,
 * and commits the change in a transaction.
 */

import { GET, POST } from "@/app/api/user/confirm-username/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyUsernameChangeToken } from "@/services/auth.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    usernameChangeToken: { findUnique: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/services/auth.service", () => ({
  verifyUsernameChangeToken: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const mockFindToken = prisma.usernameChangeToken.findUnique as jest.Mock;
const mockFindUser = prisma.user.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockVerify = verifyUsernameChangeToken as jest.Mock;

const VALID_RECORD = {
  id: "tok-1",
  userId: "user-1",
  email: "user@example.com",
  token: "valid-token",
  newUsername: null,
  expires: new Date(Date.now() + 3600_000),
};

function makeGetRequest(token?: string) {
  const url = token
    ? `http://localhost/api/user/confirm-username?token=${token}`
    : `http://localhost/api/user/confirm-username`;
  return new Request(url);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/user/confirm-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockFindToken.mockResolvedValue(VALID_RECORD);
  // Default: current user has "old_name"; username available (null)
  mockFindUser.mockResolvedValue({ id: "user-1", username: "old_name" });
  mockTransaction.mockResolvedValue([{}, {}]);
  mockVerify.mockResolvedValue(VALID_RECORD);
  (prisma.user.update as jest.Mock).mockResolvedValue({});
  (prisma.usernameChangeToken.delete as jest.Mock).mockResolvedValue({});
});

describe("GET /api/user/confirm-username", () => {
  it("returns valid: false with reason 'missing' when no token is provided", async () => {
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json).toEqual({ valid: false, reason: "missing" });
  });

  it("returns valid: false with reason 'not_found' when token does not exist", async () => {
    mockFindToken.mockResolvedValue(null);
    const res = await GET(makeGetRequest("bad-token"));
    const json = await res.json();
    expect(json).toEqual({ valid: false, reason: "not_found" });
  });

  it("returns valid: false with reason 'expired' when token has expired", async () => {
    mockFindToken.mockResolvedValue({
      ...VALID_RECORD,
      expires: new Date(Date.now() - 1000),
    });
    const res = await GET(makeGetRequest("expired-token"));
    const json = await res.json();
    expect(json).toEqual({ valid: false, reason: "expired" });
  });

  it("returns valid: true on a valid token", async () => {
    const res = await GET(makeGetRequest("valid-token"));
    const json = await res.json();
    expect(json).toEqual({ valid: true, currentUsername: "old_name" });
  });
});

describe("POST /api/user/confirm-username", () => {
  it("returns 400 when body is missing required fields", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when newUsername fails format validation", async () => {
    const res = await POST(
      makePostRequest({ token: "valid-token", newUsername: "bad name" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when verifyUsernameChangeToken throws Invalid token", async () => {
    mockVerify.mockRejectedValue(new Error("Invalid token"));
    const res = await POST(
      makePostRequest({ token: "bad-token", newUsername: "new_name" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when verifyUsernameChangeToken throws Token has expired", async () => {
    mockVerify.mockRejectedValue(new Error("Token has expired"));
    const res = await POST(
      makePostRequest({ token: "expired-token", newUsername: "new_name" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the new username matches the current one", async () => {
    mockFindUser.mockResolvedValue({ id: "user-1", username: "new_name" });
    const res = await POST(
      makePostRequest({ token: "valid-token", newUsername: "new_name" }),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("same_username");
  });

  it("returns 409 when the desired username has been taken since the request", async () => {
    // First call: current user (old_name); second call: availability check → taken
    mockFindUser
      .mockResolvedValueOnce({ id: "user-1", username: "old_name" })
      .mockResolvedValueOnce({ id: "other-user" });
    const res = await POST(
      makePostRequest({ token: "valid-token", newUsername: "new_name" }),
    );
    expect(res.status).toBe(409);
  });

  it("commits the username change in a transaction and returns the new username", async () => {
    // First call: current user (old_name); second call: username available
    mockFindUser
      .mockResolvedValueOnce({ id: "user-1", username: "old_name" })
      .mockResolvedValueOnce(null);
    const res = await POST(
      makePostRequest({ token: "valid-token", newUsername: "new_name" }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.newUsername).toBe("new_name");
    expect(mockTransaction).toHaveBeenCalled();
  });
});
