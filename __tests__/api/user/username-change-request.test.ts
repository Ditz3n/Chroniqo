/**
 * @jest-environment node
 */

// __tests__/api/user/username-change-request.test.ts

/*
 * Tests for the username change request route.
 * POST: enforces cooldown, rate-limits to one pending token, sends the email.
 * GET: returns the current pending token state.
 * Note: input validation and availability checks now live in confirm-username/route.ts.
 */

import { GET, POST } from "@/app/api/user/username-change-request/route";
import { auth } from "@/auth";
import { sendUsernameChangeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateUsernameChangeToken } from "@/services/auth.service";

function makeRequest() {
  return new Request("http://localhost/api/user/username-change-request", {
    method: "POST",
  });
}

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    usernameChangeToken: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/mail", () => ({ sendUsernameChangeEmail: jest.fn() }));
jest.mock("@/services/auth.service", () => ({
  generateUsernameChangeToken: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const mockFindUser = prisma.user.findUnique as jest.Mock;
const mockFindToken = prisma.usernameChangeToken.findFirst as jest.Mock;
const mockGenToken = generateUsernameChangeToken as jest.Mock;
const mockSendEmail = sendUsernameChangeEmail as jest.Mock;

const BASE_USER = {
  email: "user@example.com",
  locale: "da",
  usernameChangedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockFindUser.mockResolvedValue(BASE_USER);
  mockFindToken.mockResolvedValue(null);
  mockGenToken.mockResolvedValue({ token: "gen-token" });
  mockSendEmail.mockResolvedValue(undefined);
});

describe("POST /api/user/username-change-request", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user record is missing", async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns 429 with cooldown error when within the 30-day cooldown period", async () => {
    mockFindUser.mockResolvedValue({
      ...BASE_USER,
      // Changed 2 days ago - well within the 30-day window
      usernameChangedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.error).toBe("cooldown");
    expect(json.daysRemaining).toBeDefined();
  });

  it("returns 429 with pending_token error when a token is already active", async () => {
    mockFindToken.mockResolvedValue({
      expires: new Date(Date.now() + 3600_000),
    });
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.error).toBe("pending_token");
  });

  it("sends the confirmation email and returns 200 on a valid request", async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockGenToken).toHaveBeenCalledWith("user-1", "user@example.com");
    expect(mockSendEmail).toHaveBeenCalledWith(
      "user@example.com",
      "gen-token",
      "da",
    );
  });
});

describe("GET /api/user/username-change-request", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns pendingToken: null when no active token exists", async () => {
    mockFindToken.mockResolvedValue(null);
    const res = await GET();
    const json = await res.json();
    expect(json.pendingToken).toBeNull();
  });

  it("returns pendingToken with expiresAt when a token is active", async () => {
    const expires = new Date(Date.now() + 3600_000);
    mockFindToken.mockResolvedValue({ expires });
    const res = await GET();
    const json = await res.json();
    expect(json.pendingToken.expiresAt).toBeDefined();
  });
});
