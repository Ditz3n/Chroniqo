/**
 * @jest-environment node
 */

// __tests__/api/user/delete-account.test.ts

/*
 * Tests the DELETE /api/user endpoint introduced for GDPR account deletion (US1.7).
 * Token cleanup is now handled by ON DELETE CASCADE via the userId FK
 * added to PasswordResetToken and AccountDeletionToken in the schema.
 */

import { DELETE as deleteAccount } from "@/app/api/user/route";
import { auth } from "@/auth";
import { deleteUser } from "@/services/auth.service";
import type { Session } from "next-auth";

function makeDeleteRequest() {
  return new Request("http://localhost/api/user", { method: "DELETE" });
}

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/upstash", () => ({
  redis: { set: jest.fn().mockResolvedValue("OK") },
}));
jest.mock("@/lib/prisma");
jest.mock("@/services/auth.service");

describe("DELETE /api/user", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedDeleteUser = deleteUser as jest.MockedFunction<typeof deleteUser>;

  const mockSession: Session = {
    user: {
      id: "user-1",
      email: "test@example.com",
      onboarded: true,
      hasPassword: true,
      role: "USER",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await deleteAccount(makeDeleteRequest());
    expect(res.status).toBe(401);
  });

  it("calls deleteUser with the session user ID", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedDeleteUser.mockResolvedValue({ id: "user-1" } as Awaited<
      ReturnType<typeof deleteUser>
    >);

    await deleteAccount(makeDeleteRequest());

    expect(mockedDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("returns 200 with a success message on successful deletion", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedDeleteUser.mockResolvedValue({ id: "user-1" } as Awaited<
      ReturnType<typeof deleteUser>
    >);

    const res = await deleteAccount(makeDeleteRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain("deleted successfully");
  });

  it("returns 500 when deleteUser throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedDeleteUser.mockRejectedValue(new Error("DB error"));

    const res = await deleteAccount(makeDeleteRequest());
    expect(res.status).toBe(500);
  });
});
