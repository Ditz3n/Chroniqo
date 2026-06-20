/**
 * @jest-environment node
 */

/*
 * This file tests the API routes for user account onboarding and deletion.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import {
  GET as onboardGet,
  PUT as onboardPut,
} from "@/app/api/user/onboard/route";
import { DELETE as userDelete } from "@/app/api/user/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { deleteUser, onboardUser } from "@/services/auth.service";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/upstash", () => ({
  redis: { set: jest.fn().mockResolvedValue("OK") },
}));
jest.mock("@/lib/prisma");
jest.mock("@/services/auth.service");

describe("User Account and Onboard API", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const mockedDeleteUser = deleteUser as jest.MockedFunction<typeof deleteUser>;
  const mockedOnboardUser = onboardUser as jest.MockedFunction<
    typeof onboardUser
  >;

  const mockSession: Session = {
    user: {
      id: "user-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "test@example.com",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DELETE /api/user", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await userDelete(
        new Request("http://localhost/api/user", { method: "DELETE" }),
      );

      expect(res.status).toBe(401);
    });

    it("should return 200 on successful account deletion", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedDeleteUser.mockResolvedValue({ id: "user-1" } as Awaited<
        ReturnType<typeof deleteUser>
      >);

      const res = await userDelete(
        new Request("http://localhost/api/user", { method: "DELETE" }),
      );
      expect(res.status).toBe(200);
      expect(mockedDeleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("PUT /api/user/onboard", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/user/onboard", {
        method: "PUT",
        body: JSON.stringify({ username: "new_name", onboardingStep: 11 }),
      });
      const res = await onboardPut(req);

      expect(res.status).toBe(401);
    });

    it("should return 400 on invalid payload", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/user/onboard", {
        method: "PUT",
        body: JSON.stringify({ onboardingStep: 99 }),
      });
      const res = await onboardPut(req);

      expect(res.status).toBe(400);
      expect(mockedOnboardUser).not.toHaveBeenCalled();
    });

    it("should return 200 on success", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedOnboardUser.mockResolvedValue({
        id: "user-1",
        username: "new_name",
        onboarded: true,
      } as Awaited<ReturnType<typeof onboardUser>>);

      const req = new Request("https://chroniqo.com/api/user/onboard", {
        method: "PUT",
        body: JSON.stringify({ username: "new_name", onboardingStep: 11 }),
      });
      const res = await onboardPut(req);

      expect(res.status).toBe(200);
      expect(mockedOnboardUser).toHaveBeenCalledWith("user-1", {
        username: "new_name",
        onboardingStep: 11,
      });
    });
  });

  describe("GET /api/user/onboard", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await onboardGet();

      expect(res.status).toBe(401);
    });

    it("should return onboarding profile data", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        firstName: "Test",
        lastName: "User",
        onboardingStep: 11,
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      const res = await onboardGet();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.firstName).toBe("Test");
      expect(prismaDeepMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
        }),
      );
    });
  });
});
