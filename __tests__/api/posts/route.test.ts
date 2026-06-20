/**
 * @jest-environment node
 */

// __tests__/api/posts/route.test.ts

/*
 * This file tests the API route for creating a new post.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import { POST } from "@/app/api/posts/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPost } from "@/services/post.service";
import type { Session } from "next-auth";
import { TEST_IDS } from "../../utils/test-constants";
import { createMockSession } from "../../utils/test-utils";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");
jest.mock("@/services/post.service");

describe("Posts API Route (POST)", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedCreate = createPost as jest.MockedFunction<typeof createPost>;

  const mockSession: Session = createMockSession({ id: TEST_IDS.user });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Test", type: "text" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if validation fails", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const req = new Request("https://chroniqo.com/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "", type: "invalid_type" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("should return 403 on authorization/domain errors (e.g. membership)", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedCreate.mockRejectedValue(
      new Error("You must be an accepted member of this community to post"),
    );

    const req = new Request("https://chroniqo.com/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: "Valid Title",
        type: "text",
        communityId: TEST_IDS.community,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe(
      "You must be an accepted member of this community to post",
    );
  });

  it("should return 201 on success", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedCreate.mockResolvedValue({ id: TEST_IDS.post } as unknown as Awaited<
      ReturnType<typeof createPost>
    >);

    const req = new Request("https://chroniqo.com/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Valid Title", type: "text" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.post.id).toBe(TEST_IDS.post);
  });
});

// ---------------------------------------------------------------------------
// Mute enforcement - add this describe block to the existing test file
// ---------------------------------------------------------------------------

describe("POST /api/posts - mute enforcement", () => {
  const session = createMockSession({ id: TEST_IDS.user });
  const validPayload = {
    title: "Test post",
    type: "text",
    communityId: TEST_IDS.community,
    content: "Hello",
    isAnonymous: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue(null);
    (createPost as jest.Mock).mockResolvedValue({ id: TEST_IDS.post });
  });

  it("returns 403 when user has an active global mute", async () => {
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() + 86400000),
    });
    const req = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(createPost).not.toHaveBeenCalled();
  });

  it("returns 403 for a permanent global mute (expiresAt null)", async () => {
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: null,
    });
    const req = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("does NOT block posting when global mute is expired", async () => {
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() - 3600000),
    });
    const req = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createPost).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when user is community-muted in the target community", async () => {
    (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue({
      id: "cm-1",
    });
    const req = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(createPost).not.toHaveBeenCalled();
  });

  it("does NOT block posting to a profile (communityId null) when community-muted", async () => {
    // Community mute exists but post is going to profile - should not apply
    (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue({
      id: "cm-1",
    });
    const req = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, communityId: null }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(prisma.communityMute.findFirst).not.toHaveBeenCalled();
  });

  it("checks the correct community when verifying mute", async () => {
    (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    await POST(req);
    expect(prisma.communityMute.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: TEST_IDS.user,
          communityId: TEST_IDS.community,
        }),
      }),
    );
  });
});
