/**
 * @jest-environment node
 */

// __tests__/api/user/delete-request.test.ts

/*
 * Tests the POST and GET handlers for /api/user/delete-request.
 * POST issues a deletion token and sends the confirmation email.
 * GET validates an incoming token against the authenticated session.
 */

import {
  GET as getDeleteRequest,
  POST as postDeleteRequest,
} from "@/app/api/user/delete-request/route";
import { auth } from "@/auth";
import * as mail from "@/lib/mail";
import { prisma as prismaMock } from "@/lib/prisma";
import { generateAccountDeletionToken } from "@/services/auth.service";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma");
jest.mock("@/lib/mail");
jest.mock("@/services/auth.service");

describe("POST /api/user/delete-request", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const mockedGenerateToken = generateAccountDeletionToken as jest.Mock;
  const mockedSendEmail = mail.sendAccountDeletionEmail as jest.Mock;

  const MOCK_USER_ID = "user-1";
  const MOCK_EMAIL = "test@example.com";
  const MOCK_TOKEN = "mock-deletion-token-uuid";

  const mockSession: Session = {
    user: {
      id: MOCK_USER_ID,
      email: MOCK_EMAIL,
      onboarded: true,
      hasPassword: true,
      role: "USER",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockSessionNoEmail: Session = {
    user: {
      id: MOCK_USER_ID,
      onboarded: true,
      hasPassword: true,
      role: "USER",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  function makePostRequest(body: object): Request {
    return new Request("http://localhost/api/user/delete-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function makeGetRequest(token?: string): Request {
    const url = token
      ? `http://localhost/api/user/delete-request?token=${token}`
      : "http://localhost/api/user/delete-request";
    return new Request(url, { method: "GET" });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSendEmail.mockResolvedValue(undefined);
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated and no token is provided", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await getDeleteRequest(makeGetRequest(undefined));
      expect(res.status).toBe(401);
    });

    it("returns 401 when the session has no email", async () => {
      mockedAuth.mockResolvedValue(mockSessionNoEmail);
      const res = await postDeleteRequest(makePostRequest({ locale: "en" }));
      expect(res.status).toBe(401);
    });

    it("generates a token and sends an email on success", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGenerateToken.mockResolvedValue({
        id: "token_id_1",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: MOCK_TOKEN,
        expires: new Date(Date.now() + 3600 * 1000),
      });

      const res = await postDeleteRequest(makePostRequest({ locale: "en" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Deletion confirmation email sent");
      expect(mockedGenerateToken).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_EMAIL,
      );
      expect(mockedSendEmail).toHaveBeenCalledWith(
        MOCK_EMAIL,
        MOCK_TOKEN,
        "en",
      );
    });

    it("defaults locale to 'da' when an invalid locale is supplied", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGenerateToken.mockResolvedValue({
        id: "token_id_2",
        email: MOCK_EMAIL,
        token: MOCK_TOKEN,
        expires: new Date(Date.now() + 3600 * 1000),
      });

      // Supplying an unsupported locale - Zod default should fall back to 'da'
      const res = await postDeleteRequest(makePostRequest({ locale: "fr" }));

      expect(res.status).toBe(200);
      expect(mockedSendEmail).toHaveBeenCalledWith(
        MOCK_EMAIL,
        MOCK_TOKEN,
        "da",
      );
    });

    it("returns 500 when token generation throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGenerateToken.mockRejectedValue(new Error("DB failure"));

      const res = await postDeleteRequest(makePostRequest({ locale: "da" }));
      expect(res.status).toBe(500);
    });
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated and no token is provided", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await getDeleteRequest(makeGetRequest(undefined));
      expect(res.status).toBe(401);
    });

    it("returns valid: false with reason 'missing_token' when no token is provided", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const res = await getDeleteRequest(makeGetRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.valid).toBe(false);
      expect(json.reason).toBe("missing_token");
    });

    it("returns valid: false with reason 'not_found' when the token does not exist", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.accountDeletionToken.findUnique.mockResolvedValue(null);

      const res = await getDeleteRequest(makeGetRequest("nonexistent-token"));
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe("not_found");
    });

    it("returns valid: true for any valid non-expired token regardless of caller", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.accountDeletionToken.findUnique.mockResolvedValue({
        id: "tok_1",
        userId: "different-user",
        email: "other@example.com",
        token: MOCK_TOKEN,
        expires: new Date(Date.now() + 3600 * 1000),
      });
      const res = await getDeleteRequest(makeGetRequest(MOCK_TOKEN));
      const json = await res.json();
      expect(json.valid).toBe(true);
    });

    it("returns valid: false with reason 'expired' when the token has passed its TTL", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.accountDeletionToken.findUnique.mockResolvedValue({
        id: "tok_2",
        userId: "user-1",
        email: MOCK_EMAIL,
        token: MOCK_TOKEN,
        expires: new Date(Date.now() - 1000),
      });

      const res = await getDeleteRequest(makeGetRequest(MOCK_TOKEN));
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe("expired");
    });

    it("returns valid: true for a correct, unexpired token matching the session email", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.accountDeletionToken.findUnique.mockResolvedValue({
        id: "tok_3",
        userId: "user-1",
        email: MOCK_EMAIL,
        token: MOCK_TOKEN,
        expires: new Date(Date.now() + 3600 * 1000),
      });

      const res = await getDeleteRequest(makeGetRequest(MOCK_TOKEN));
      const json = await res.json();

      expect(json.valid).toBe(true);
    });
  });
});
