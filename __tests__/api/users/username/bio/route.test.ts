/**
 * @jest-environment node
 */

// __tests__/api/users/username/bio/route.test.ts

/*
 * This file tests the PUT /api/users/username/bio endpoint,
 * which allows users to update their bio information.
 */

import { PUT } from "@/app/api/users/[username]/bio/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

describe("PUT /api/users/[username]/bio", () => {
  const mockedAuth = auth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/users/testuser/bio", {
      method: "PUT",
      body: JSON.stringify({ bio: "Hello world" }),
    });

    const res = await PUT(req, {
      params: Promise.resolve({ username: "testuser" }),
    });
    expect(res.status).toBe(401);
  });

  it("should return 401 if authenticated as a different user", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-1", username: "wronguser" },
    });
    const req = new Request("https://chroniqo.com/api/users/testuser/bio", {
      method: "PUT",
      body: JSON.stringify({ bio: "Hello world" }),
    });

    const res = await PUT(req, {
      params: Promise.resolve({ username: "testuser" }),
    });
    expect(res.status).toBe(401);
  });

  it("should return 400 if bio exceeds 150 characters", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-1", username: "testuser" },
    });
    const req = new Request("https://chroniqo.com/api/users/testuser/bio", {
      method: "PUT",
      body: JSON.stringify({ bio: "a".repeat(151) }),
    });

    const res = await PUT(req, {
      params: Promise.resolve({ username: "testuser" }),
    });
    expect(res.status).toBe(400);
  });

  it("should return 200 and update the bio when called by the correct user", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-1", username: "testuser" },
    });
    (prismaMock.user.update as jest.Mock).mockResolvedValue({});

    const req = new Request("https://chroniqo.com/api/users/testuser/bio", {
      method: "PUT",
      body: JSON.stringify({ bio: "This is my new bio!" }),
    });

    const res = await PUT(req, {
      params: Promise.resolve({ username: "testuser" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { bio: "This is my new bio!" },
    });
  });

  it("should strip empty lines from the bio before saving", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-1", username: "testuser" },
    });
    (prismaMock.user.update as jest.Mock).mockResolvedValue({});

    const dirtyBio = "Line 1\n\n\nLine 2\n    \nLine 3";
    const req = new Request("https://chroniqo.com/api/users/testuser/bio", {
      method: "PUT",
      body: JSON.stringify({ bio: dirtyBio }),
    });

    await PUT(req, { params: Promise.resolve({ username: "testuser" }) });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { bio: "Line 1\nLine 2\nLine 3" },
    });
  });

  it("should handle null bio correctly (clears the bio)", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-1", username: "testuser" },
    });
    (prismaMock.user.update as jest.Mock).mockResolvedValue({});

    const req = new Request("https://chroniqo.com/api/users/testuser/bio", {
      method: "PUT",
      body: JSON.stringify({ bio: null }),
    });

    await PUT(req, { params: Promise.resolve({ username: "testuser" }) });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { bio: null },
    });
  });
});
