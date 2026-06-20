// __tests__/services/auth.service.test.ts

/*
 * This file tests the core functionalities of the auth service,
 * including user registration and onboarding.
 * It ensures that critical logic such as password hashing, duplicate email checks,
 * and onboarding flow are working as expected.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  generateAccountDeletionToken,
  generateEmailVerificationToken,
  generateSignupVerificationToken,
  onboardUser,
  registerUser,
  verifyEmailToken,
  verifySignupToken,
} from "@/services/auth.service";
import { DailyStatus, PrismaClient, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DeepMockProxy } from "jest-mock-extended";
import { TEST_EMAILS, TEST_IDS } from "../utils/test-constants";
import { createMockUser } from "../utils/test-utils";

// No factory - Jest resolves to src/lib/__mocks__/prisma.ts automatically,
// which preserves all jest-mock-extended methods on the mock object.
jest.mock("@/lib/prisma");

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password_string"),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/mail");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Auth Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should throw an error if email already exists", async () => {
      prismaDeepMock.user.findFirst.mockResolvedValue(
        createMockUser({
          id: TEST_IDS.user,
          email: TEST_EMAILS.default,
          onboarded: false,
          hashedPassword: "hash",
        }),
      );

      await expect(
        registerUser({ email: "test@example.com", password: "password123" }),
      ).rejects.toThrow("Email already exists");
    });

    it("should hash the password and create a user", async () => {
      prismaDeepMock.user.findFirst.mockResolvedValue(null);
      prismaDeepMock.user.create.mockResolvedValue(
        createMockUser({
          id: "user-123",
          email: TEST_EMAILS.default,
          username: null,
        }),
      );

      const result = await registerUser({
        email: "test@example.com",
        password: "password123",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(prismaDeepMock.user.create).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          hashedPassword: "hashed_password_string",
        },
        select: {
          id: true,
          email: true,
          username: true,
        },
      });
      expect(result.id).toBe("user-123");
    });

    it("should throw an error if the email is globally banned", async () => {
      const banned = {
        id: "ban-1",
        email: TEST_EMAILS.banned,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        reason: null,
        expiresAt: null,
        deleteToken: null,
        isDummy: false,
        isActive: true,
      };
      prismaDeepMock.globalBan.findFirst.mockResolvedValue(banned);

      await expect(
        registerUser({ email: TEST_EMAILS.banned, password: "password123" }),
      ).rejects.toThrow("This email is banned from the platform");

      expect(prismaDeepMock.user.create).not.toHaveBeenCalled();
    });

    it("should create user if email is not banned and not taken", async () => {
      prismaDeepMock.globalBan.findFirst.mockResolvedValue(null);
      prismaDeepMock.user.findFirst.mockResolvedValue(null);
      prismaDeepMock.user.create.mockResolvedValue({
        id: "u1",
        email: "clean@test.com",
        username: null,
      } as unknown as User);

      const result = await registerUser({
        email: "clean@test.com",
        password: "password123",
      });
      expect(result.id).toBe("u1");
      expect(prismaDeepMock.user.create).toHaveBeenCalled();
    });
  });

  describe("onboardUser", () => {
    it("should throw if username is taken by another user", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "different-user",
        username: "cool_name",
      } as unknown as User);

      await expect(
        onboardUser("current-user", { username: "cool_name" }),
      ).rejects.toThrow("Username is already taken");
    });

    it("should set onboarded to true when step is 11 and create initial DailyStatus", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue(null);

      const mockUpdatedUser = {
        id: "current-user",
        username: "tester",
        onboarded: true,
      };
      prismaDeepMock.user.update.mockResolvedValue(
        mockUpdatedUser as unknown as User,
      );
      prismaDeepMock.dailyStatus.upsert.mockResolvedValue(
        {} as unknown as DailyStatus,
      );

      const result = await onboardUser("current-user", {
        firstName: "John",
        lastName: "Doe",
        onboardingStep: 11,
        moodValue: 3,
        moodNote: "Ready to go",
      });

      expect(prismaDeepMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "John",
            name: "John Doe",
            onboarded: true,
            onboardingStep: 11,
          }),
        }),
      );

      expect(prismaDeepMock.dailyStatus.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe("generateAccountDeletionToken", () => {
    const MOCK_USER_ID = "test-user-id";
    const MOCK_EMAIL = "test@example.com";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("deletes any existing token for the email before creating a new one", async () => {
      prismaDeepMock.accountDeletionToken.deleteMany.mockResolvedValueOnce({
        count: 1,
      });
      prismaDeepMock.accountDeletionToken.create.mockResolvedValueOnce({
        id: "tok_1",
        userId: "user-1",
        email: MOCK_EMAIL,
        token: "new-uuid-token",
        expires: new Date(Date.now() + 3600 * 1000),
      });

      await generateAccountDeletionToken(MOCK_USER_ID, MOCK_EMAIL);

      expect(
        prismaDeepMock.accountDeletionToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: { email: MOCK_EMAIL },
      });
    });

    it("creates a new token with a 1-hour TTL", async () => {
      const before = Date.now();
      prismaDeepMock.accountDeletionToken.deleteMany.mockResolvedValueOnce({
        count: 0,
      });
      prismaDeepMock.accountDeletionToken.create.mockResolvedValueOnce({
        id: "tok_2",
        userId: "user-1",
        email: MOCK_EMAIL,
        token: "generated-uuid",
        expires: new Date(Date.now() + 3600 * 1000),
      });

      await generateAccountDeletionToken(MOCK_USER_ID, MOCK_EMAIL);
      const after = Date.now();

      const callArgs =
        prismaDeepMock.accountDeletionToken.create.mock.calls[0][0];
      const expiresMs = new Date(callArgs.data.expires).getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 3600 * 1000 - 5000);
      expect(expiresMs).toBeLessThanOrEqual(after + 3600 * 1000 + 5000);
    });

    it("returns the newly created token record", async () => {
      const mockRecord = {
        id: "tok_3",
        userId: "user-1",
        email: MOCK_EMAIL,
        token: "abc-def-ghi",
        expires: new Date(Date.now() + 3600 * 1000),
      };
      prismaDeepMock.accountDeletionToken.deleteMany.mockResolvedValueOnce({
        count: 0,
      });
      prismaDeepMock.accountDeletionToken.create.mockResolvedValueOnce(
        mockRecord,
      );

      const result = await generateAccountDeletionToken(
        MOCK_USER_ID,
        MOCK_EMAIL,
      );

      expect(result).toEqual(mockRecord);
    });
  });

  describe("generateEmailVerificationToken", () => {
    const MOCK_USER_ID = "test-user-id";
    const MOCK_EMAIL = "test@example.com";

    it("deletes any existing token for the email before creating a new one", async () => {
      prismaDeepMock.emailVerificationToken.deleteMany.mockResolvedValueOnce({
        count: 1,
      });
      prismaDeepMock.emailVerificationToken.create.mockResolvedValueOnce({
        id: "tok-1",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: "uuid-token",
        expires: new Date(Date.now() + 3600 * 1000),
      });

      await generateEmailVerificationToken(MOCK_USER_ID, MOCK_EMAIL);

      expect(
        prismaDeepMock.emailVerificationToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: { email: MOCK_EMAIL },
      });
    });

    it("creates a token with a 1-hour TTL", async () => {
      const before = Date.now();
      prismaDeepMock.emailVerificationToken.deleteMany.mockResolvedValueOnce({
        count: 0,
      });
      prismaDeepMock.emailVerificationToken.create.mockResolvedValueOnce({
        id: "tok-2",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: "uuid-token-2",
        expires: new Date(Date.now() + 3600 * 1000),
      });

      await generateEmailVerificationToken(MOCK_USER_ID, MOCK_EMAIL);
      const after = Date.now();

      const callArgs =
        prismaDeepMock.emailVerificationToken.create.mock.calls[0][0];
      const expiresMs = new Date(callArgs.data.expires).getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 3600 * 1000 - 5000);
      expect(expiresMs).toBeLessThanOrEqual(after + 3600 * 1000 + 5000);
    });

    it("returns the newly created token record", async () => {
      const mockRecord = {
        id: "tok-3",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: "abc-xyz",
        expires: new Date(Date.now() + 3600 * 1000),
      };
      prismaDeepMock.emailVerificationToken.deleteMany.mockResolvedValueOnce({
        count: 0,
      });
      prismaDeepMock.emailVerificationToken.create.mockResolvedValueOnce(
        mockRecord,
      );

      const result = await generateEmailVerificationToken(
        MOCK_USER_ID,
        MOCK_EMAIL,
      );

      expect(result).toEqual(mockRecord);
    });
  });

  describe("verifyEmailToken", () => {
    it("throws if the token does not exist", async () => {
      prismaDeepMock.emailVerificationToken.findUnique.mockResolvedValue(null);

      await expect(verifyEmailToken("bad-token")).rejects.toThrow(
        "Invalid token",
      );
    });

    it("throws if the token has expired", async () => {
      prismaDeepMock.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "u1",
        email: "test@example.com",
        token: "expired-token",
        expires: new Date(Date.now() - 1000),
      });

      await expect(verifyEmailToken("expired-token")).rejects.toThrow(
        "Token has expired",
      );
    });

    it("sets emailVerified and deletes the token on success", async () => {
      prismaDeepMock.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "u1",
        email: "test@example.com",
        token: "valid-token",
        expires: new Date(Date.now() + 3600_000),
      });
      prismaDeepMock.$transaction.mockResolvedValue([{}, {}]);

      const result = await verifyEmailToken("valid-token");

      expect(result).toBe(true);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
    });
  });

  describe("generateSignupVerificationToken", () => {
    const MOCK_USER_ID = "test-user-id";
    const MOCK_EMAIL = "test@example.com";

    it("deletes any existing token for the user before creating a new one", async () => {
      prismaDeepMock.signupVerificationToken.deleteMany.mockResolvedValueOnce({
        count: 1,
      });
      prismaDeepMock.signupVerificationToken.create.mockResolvedValueOnce({
        id: "svt-1",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: "new-uuid-token",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      await generateSignupVerificationToken(MOCK_USER_ID, MOCK_EMAIL);

      // Scoped to userId, not email - one active token per user
      expect(
        prismaDeepMock.signupVerificationToken.deleteMany,
      ).toHaveBeenCalledWith({ where: { userId: MOCK_USER_ID } });
    });

    it("creates a token with a 24-hour TTL", async () => {
      const before = Date.now();
      prismaDeepMock.signupVerificationToken.deleteMany.mockResolvedValueOnce({
        count: 0,
      });
      prismaDeepMock.signupVerificationToken.create.mockResolvedValueOnce({
        id: "svt-2",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: "uuid-24h",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      await generateSignupVerificationToken(MOCK_USER_ID, MOCK_EMAIL);
      const after = Date.now();

      const callArgs =
        prismaDeepMock.signupVerificationToken.create.mock.calls[0][0];
      const expiresMs = new Date(callArgs.data.expires).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      // Allow ±5s tolerance for test execution time
      expect(expiresMs).toBeGreaterThanOrEqual(before + twentyFourHours - 5000);
      expect(expiresMs).toBeLessThanOrEqual(after + twentyFourHours + 5000);
    });

    it("returns the newly created token record", async () => {
      const mockRecord = {
        id: "svt-3",
        userId: MOCK_USER_ID,
        email: MOCK_EMAIL,
        token: "signup-abc-xyz",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      prismaDeepMock.signupVerificationToken.deleteMany.mockResolvedValueOnce({
        count: 0,
      });
      prismaDeepMock.signupVerificationToken.create.mockResolvedValueOnce(
        mockRecord,
      );

      const result = await generateSignupVerificationToken(
        MOCK_USER_ID,
        MOCK_EMAIL,
      );

      expect(result).toEqual(mockRecord);
    });
  });

  describe("verifySignupToken", () => {
    it("throws if the token does not exist", async () => {
      prismaDeepMock.signupVerificationToken.findUnique.mockResolvedValue(null);

      await expect(verifySignupToken("bad-token")).rejects.toThrow(
        "Invalid token",
      );
    });

    it("throws if the token has expired", async () => {
      prismaDeepMock.signupVerificationToken.findUnique.mockResolvedValue({
        id: "svt-1",
        userId: "u1",
        email: "test@example.com",
        token: "expired-token",
        expires: new Date(Date.now() - 1000),
        createdAt: new Date(),
      });

      await expect(verifySignupToken("expired-token")).rejects.toThrow(
        "Token has expired",
      );
    });

    it("sets signupVerified and deletes the token on success", async () => {
      prismaDeepMock.signupVerificationToken.findUnique.mockResolvedValue({
        id: "svt-1",
        userId: "u1",
        email: "test@example.com",
        token: "valid-token",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      prismaDeepMock.$transaction.mockResolvedValue([{}, {}]);

      const result = await verifySignupToken("valid-token");

      expect(result).toBe(true);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
    });
  });
});
