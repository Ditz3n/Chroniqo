// __tests__/api/auth/check-email/route.test.ts

/*
 * This file tests the POST /api/auth/check-email endpoint, which checks if a given email is globally banned.
 * The tests cover scenarios such as invalid email formats, emails that are not banned, and emails that are banned.
 * For banned emails, it also verifies that a new delete token is generated and returned in the response.
 */

import { POST } from "@/app/api/auth/check-email/route";
import { prisma as prismaMock } from "@/lib/prisma";

jest.mock("@/lib/prisma");

describe("POST /api/auth/check-email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 for invalid email", async () => {
    const req = new Request("https://chroniqo.com/api/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return isBanned: false if no active ban exists", async () => {
    (prismaMock.globalBan.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email: "clean@test.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isBanned).toBe(false);
  });

  it("should return isBanned: true and update the token if active ban exists", async () => {
    (prismaMock.globalBan.findFirst as jest.Mock).mockResolvedValue({
      id: "ban-1",
      email: "banned@test.com",
      reason: "TOS Violation",
      expiresAt: null,
    });

    (prismaMock.globalBan.update as jest.Mock).mockResolvedValue({});

    const req = new Request("https://chroniqo.com/api/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email: "banned@test.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isBanned).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.reason).toBe("TOS Violation");
    expect(data.expires).toBe(null);

    expect(prismaMock.globalBan.update).toHaveBeenCalledWith({
      where: { id: "ban-1" },
      data: { deleteToken: expect.any(String) },
    });
  });
});
