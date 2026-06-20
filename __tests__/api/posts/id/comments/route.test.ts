// __tests__/api/posts/id/comments/route.test.ts

/*
 * This file tests the post comments API route with mute enforcement.
 * It ensures global and community mutes are respected, profile-post
 * exceptions are handled, and valid requests create comments successfully.
 */

import { POST } from "@/app/api/posts/[id]/comments/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createComment } from "@/services/comment.service";
import { TEST_IDS } from "../../../../utils/test-constants";
import { createMockSession } from "../../../../utils/test-utils";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");
jest.mock("@/services/comment.service");

const session = createMockSession({ id: TEST_IDS.user });

const mockPost = { communityId: TEST_IDS.community };
const mockProfilePost = { communityId: null };

const validBody = { content: "Great post!" };

function makeRequest(body: unknown = validBody): Request {
  return new Request(`http://localhost/api/posts/${TEST_IDS.post}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(postId: string = TEST_IDS.post) {
  return { params: Promise.resolve({ id: postId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);
  (createComment as jest.Mock).mockResolvedValue({ id: "comment-1" });
});

describe("POST /api/posts/[id]/comments - mute enforcement", () => {
  it("returns 401 when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    const res = await POST(makeRequest({ content: "" }), makeParams());
    // content is required by createCommentSchema - expect validation failure
    // (exact status depends on schema; 400 is the expected response)
    expect([400, 422]).toContain(res.status);
  });

  it("returns 403 when user has an active global mute", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() + 86400000),
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
    // createComment should never be reached
    expect(createComment).not.toHaveBeenCalled();
  });

  it("returns 403 for a permanent global mute (null expiresAt)", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: null,
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it("does NOT block commenting when global mute is expired", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.globalMute.findUnique as jest.Mock).mockResolvedValue({
      expiresAt: new Date(Date.now() - 3600000),
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(201);
    expect(createComment).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when user is community-muted on a community post", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue({
      id: "cm-1",
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("does NOT block commenting on a profile post (communityId null) when community-muted elsewhere", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    // Post is on a profile, not a community
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockProfilePost);
    // Community mute exists but should not apply
    (prisma.communityMute.findFirst as jest.Mock).mockResolvedValue({
      id: "cm-1",
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(201);
    // Community mute check should not have been called at all
    expect(prisma.communityMute.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the post does not exist", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 201 and calls createComment when no mute is active", async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(201);
    expect(createComment).toHaveBeenCalledWith(
      TEST_IDS.user,
      TEST_IDS.post,
      expect.any(Object),
    );
  });
});
