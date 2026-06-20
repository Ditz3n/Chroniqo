// __tests__/api/auth/banned-account/route.test.ts

/*
 * This file tests the DELETE /api/auth/banned-account endpoint,
 * which allows users with a valid deletion token to permanently
 * delete their account data after being banned.
 * The tests cover scenarios such as missing or invalid tokens, successful deletion,
 * and edge cases where the user account may have already been deleted.
 */

import { DELETE } from "@/app/api/auth/banned-account/route";
import { prisma as prismaMock } from "@/lib/prisma";

jest.mock("@/lib/prisma");

describe("DELETE /api/auth/banned-account", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if token is missing", async () => {
    const req = new Request("https://chroniqo.com/api", {
      method: "DELETE",
      body: JSON.stringify({}),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("should return 401 if token is invalid or expired", async () => {
    (prismaMock.globalBan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api", {
      method: "DELETE",
      body: JSON.stringify({ token: "invalid-token" }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("should delete the user and clear the token if valid", async () => {
    (prismaMock.globalBan.findUnique as jest.Mock).mockResolvedValue({
      id: "ban-123",
      userId: "user-456",
      deleteToken: "valid-token",
      isActive: true,
    });

    (prismaMock.user.delete as jest.Mock).mockResolvedValue({});
    (prismaMock.globalBan.update as jest.Mock).mockResolvedValue({});

    const req = new Request("https://chroniqo.com/api", {
      method: "DELETE",
      body: JSON.stringify({ token: "valid-token" }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: "user-456" },
    });
    expect(prismaMock.globalBan.update).toHaveBeenCalledWith({
      where: { id: "ban-123" },
      data: { deleteToken: null },
    });
  });

  it("should clear the token even if userId is already null (account already deleted)", async () => {
    (prismaMock.globalBan.findUnique as jest.Mock).mockResolvedValue({
      id: "ban-123",
      userId: null,
      deleteToken: "valid-token",
      isActive: true,
    });

    (prismaMock.globalBan.update as jest.Mock).mockResolvedValue({});

    const req = new Request("https://chroniqo.com/api", {
      method: "DELETE",
      body: JSON.stringify({ token: "valid-token" }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(prismaMock.globalBan.update).toHaveBeenCalledWith({
      where: { id: "ban-123" },
      data: { deleteToken: null },
    });
  });
});
