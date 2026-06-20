/**
 * @jest-environment node
 */

/*
 * This file tests the API routes for authentication, including registration,
 * Google signup completion, password reset flow, and the NextAuth handler.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 * Mocking is used to isolate the API route logic from the underlying authentication and database layers.
 */

import {
  GET as nextAuthGET,
  POST as nextAuthPOST,
} from "@/app/api/auth/[...nextauth]/route";
import { POST as completeGooglePOST } from "@/app/api/auth/complete-google/route";
import { POST as forgotPasswordPOST } from "@/app/api/auth/forgot-password/route";
import { GET as popupCallbackGET } from "@/app/api/auth/popup-callback/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as resetPasswordPOST } from "@/app/api/auth/reset-password/route";
import { auth, handlers } from "@/auth";
import { sendPasswordResetEmail } from "@/lib/mail";
import { prisma as prismaMock } from "@/lib/prisma";
import {
  completeGoogleSignup,
  generatePasswordResetToken,
  registerUser,
  resetPassword,
} from "@/services/auth.service";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";
import { TEST_EMAILS, TEST_IDS } from "../../utils/test-constants";
import { createMockSession } from "../../utils/test-utils";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}));

jest.mock("@/lib/prisma");
jest.mock("@/lib/mail", () => ({
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock("@/services/auth.service");
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  }),
}));

describe("Auth API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedHandlers = handlers as {
    GET: jest.Mock;
    POST: jest.Mock;
  };
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const mockedRegisterUser = registerUser as jest.MockedFunction<
    typeof registerUser
  >;
  const mockedCompleteGoogleSignup =
    completeGoogleSignup as jest.MockedFunction<typeof completeGoogleSignup>;
  const mockedGeneratePasswordResetToken =
    generatePasswordResetToken as jest.MockedFunction<
      typeof generatePasswordResetToken
    >;
  const mockedSendPasswordResetEmail =
    sendPasswordResetEmail as jest.MockedFunction<
      typeof sendPasswordResetEmail
    >;
  const mockedResetPassword = resetPassword as jest.MockedFunction<
    typeof resetPassword
  >;

  const mockSession: Session = createMockSession();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("[...nextauth] route", () => {
    it("should re-export handlers from auth", () => {
      expect(nextAuthGET).toBe(mockedHandlers.GET);
      expect(nextAuthPOST).toBe(mockedHandlers.POST);
    });
  });

  describe("POST /api/auth/register", () => {
    it("should return 400 on validation failure", async () => {
      const req = new Request("https://chroniqo.com/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", password: "123" }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(400);
    });

    it("should return 201 on success", async () => {
      mockedRegisterUser.mockResolvedValue({
        id: TEST_IDS.user,
        email: TEST_EMAILS.default,
        username: null,
      } as Awaited<ReturnType<typeof registerUser>>);

      const req = new Request("https://chroniqo.com/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(201);
    });

    it("should return 409 for duplicate email/username errors", async () => {
      mockedRegisterUser.mockRejectedValue(new Error("Email already exists"));

      const req = new Request("https://chroniqo.com/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(409);
    });

    it("should return 500 for unexpected register errors", async () => {
      mockedRegisterUser.mockRejectedValue(new Error("Unexpected"));

      const req = new Request("https://chroniqo.com/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/auth/complete-google", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/auth/complete-google", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const res = await completeGooglePOST(req);
      expect(res.status).toBe(401);
    });

    it("should return 200 on success", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCompleteGoogleSignup.mockResolvedValue({
        id: TEST_IDS.user,
        email: TEST_EMAILS.default,
      } as Awaited<ReturnType<typeof completeGoogleSignup>>);

      const req = new Request("https://chroniqo.com/api/auth/complete-google", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const res = await completeGooglePOST(req);
      expect(res.status).toBe(200);
      expect(mockedCompleteGoogleSignup).toHaveBeenCalledWith(TEST_IDS.user, {
        password: "password123",
      });
    });

    it("should return 400 on validation failure", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/auth/complete-google", {
        method: "POST",
        body: JSON.stringify({ password: "123" }),
      });

      const res = await completeGooglePOST(req);
      expect(res.status).toBe(400);
    });

    it("should return 409 on username conflict", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCompleteGoogleSignup.mockRejectedValue(
        new Error("Username already taken"),
      );

      const req = new Request("https://chroniqo.com/api/auth/complete-google", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const res = await completeGooglePOST(req);
      expect(res.status).toBe(409);
    });

    it("should return 500 for unexpected errors", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCompleteGoogleSignup.mockRejectedValue(new Error("Unexpected"));

      const req = new Request("https://chroniqo.com/api/auth/complete-google", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const res = await completeGooglePOST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("should return 400 on validation failure", async () => {
      const req = new Request("https://chroniqo.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "bad-email" }),
      });

      const res = await forgotPasswordPOST(req);
      expect(res.status).toBe(400);
    });

    it("should return 200 and send reset mail when user has password", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        hashedPassword: "hash",
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
      mockedGeneratePasswordResetToken.mockResolvedValue({
        id: "tok-1",
        email: "test@example.com",
        token: "token-1",
        expires: new Date(Date.now() + 3600000),
      } as Awaited<ReturnType<typeof generatePasswordResetToken>>);

      const req = new Request("https://chroniqo.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const res = await forgotPasswordPOST(req);
      expect(res.status).toBe(200);
      expect(mockedSendPasswordResetEmail).toHaveBeenCalledWith(
        "test@example.com",
        "token-1",
        "da",
      );
    });

    it("should return 200 and not send mail when user does not exist", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "missing@example.com" }),
      });

      const res = await forgotPasswordPOST(req);
      expect(res.status).toBe(200);
      expect(mockedGeneratePasswordResetToken).not.toHaveBeenCalled();
      expect(mockedSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should return 200 and not send mail when user has no password", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        hashedPassword: null,
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      const req = new Request("https://chroniqo.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const res = await forgotPasswordPOST(req);
      expect(res.status).toBe(200);
      expect(mockedGeneratePasswordResetToken).not.toHaveBeenCalled();
      expect(mockedSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should return 500 when token generation fails", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        hashedPassword: "hash",
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
      mockedGeneratePasswordResetToken.mockRejectedValue(new Error("DB fail"));

      const req = new Request("https://chroniqo.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const res = await forgotPasswordPOST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("should return 400 on invalid payload", async () => {
      const req = new Request("https://chroniqo.com/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: "", password: "short" }),
      });

      const res = await resetPasswordPOST(req);
      expect(res.status).toBe(400);
    });

    it("should return 200 on success", async () => {
      mockedResetPassword.mockResolvedValue(true);

      const req = new Request("https://chroniqo.com/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: "token-1", password: "password123" }),
      });

      const res = await resetPasswordPOST(req);
      expect(res.status).toBe(200);
      expect(mockedResetPassword).toHaveBeenCalledWith(
        "token-1",
        "password123",
      );
    });

    it("should return 400 when reset service throws domain error", async () => {
      mockedResetPassword.mockRejectedValue(new Error("Token is invalid"));

      const req = new Request("https://chroniqo.com/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: "token-1", password: "password123" }),
      });

      const res = await resetPasswordPOST(req);
      expect(res.status).toBe(400);
    });

    it("should return 500 for non-Error throws", async () => {
      mockedResetPassword.mockRejectedValue("non-error-throw");

      const req = new Request("https://chroniqo.com/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: "token-1", password: "password123" }),
      });

      const res = await resetPasswordPOST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/auth/popup-callback", () => {
    it("should return html with google-auth-success for a clean login", async () => {
      // No session cookie present → falls through to google-auth-success
      prismaDeepMock.session.findUnique.mockResolvedValue(null);

      const req = new Request("http://localhost/api/auth/popup-callback");
      const res = await popupCallbackGET(req);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(html).toContain("google-auth-success");
    });

    it("should return html with OAUTH_BANNED when banned=true query param is present", async () => {
      const req = new Request(
        "http://localhost/api/auth/popup-callback?banned=true&token=tok-1&reason=Spam",
      );
      const res = await popupCallbackGET(req);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain("OAUTH_BANNED");
      expect(html).toContain("tok-1");
    });
  });
});
