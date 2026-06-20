// __tests__/api/posts/id/vote/route.test.ts
import { POST } from "@/app/api/posts/[id]/vote/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import { NextRequest } from "next/server";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("POST /api/posts/[id]/vote", () => {
  const mockSession = { user: { id: "user-1", role: "USER" as const } };
  const mockPostId = "post-1";
  const mockOptionId = "opt-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createRequest(body: object) {
    return new NextRequest(`http://localhost/api/posts/${mockPostId}/vote`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 401 if unauthorized", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const req = createRequest({ optionId: mockOptionId });
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 if validation fails", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(mockSession);
    const req = createRequest({}); // Missing optionId
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 if post is not found", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(mockSession);
    prismaDeepMock.post.findUnique.mockResolvedValueOnce(null);

    const req = createRequest({ optionId: mockOptionId });
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Post not found");
  });

  it("returns 400 if post is not a poll", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(mockSession);
    prismaDeepMock.post.findUnique.mockResolvedValueOnce({
      isDummy: false,
      id: mockPostId,
      authorId: "user-1",
      communityId: null,
      title: "Test",
      type: "text",
      content: null,
      metadata: {},
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
    });

    const req = createRequest({ optionId: mockOptionId });
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Not a poll");
  });

  it("returns 400 if user already voted", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(mockSession);
    prismaDeepMock.post.findUnique.mockResolvedValueOnce({
      isDummy: false,
      id: mockPostId,
      authorId: "user-1",
      communityId: null,
      title: "Test",
      type: "poll",
      content: null,
      metadata: {
        voters: { "user-1": mockOptionId },
        totalVotes: 1,
        options: [{ id: mockOptionId, text: "Yes", votes: 1 }],
        closesAt: new Date(Date.now() + 100000).toISOString(),
      },
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
    });

    const req = createRequest({ optionId: mockOptionId });
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Already voted");
  });

  it("returns 400 if poll is closed", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(mockSession);
    prismaDeepMock.post.findUnique.mockResolvedValueOnce({
      isDummy: false,
      id: mockPostId,
      authorId: "user-1",
      communityId: null,
      title: "Test",
      type: "poll",
      content: null,
      metadata: {
        voters: {},
        totalVotes: 0,
        options: [{ id: mockOptionId, text: "Yes", votes: 0 }],
        closesAt: new Date(Date.now() - 1000).toISOString(),
      },
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
    });

    const req = createRequest({ optionId: mockOptionId });
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Poll is closed");
  });

  it("successfully records the vote", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(mockSession);
    const mockMetadata = {
      voters: {},
      totalVotes: 0,
      options: [{ id: mockOptionId, text: "Yes", votes: 0 }],
      closesAt: new Date(Date.now() + 100000).toISOString(), // Future date
    };

    prismaDeepMock.post.findUnique.mockResolvedValueOnce({
      isDummy: false,
      id: mockPostId,
      authorId: "user-1",
      communityId: null,
      title: "Test",
      type: "poll",
      content: null,
      metadata: mockMetadata,
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
    });

    prismaDeepMock.post.update.mockResolvedValueOnce({
      isDummy: false,
      id: mockPostId,
      authorId: "user-1",
      communityId: null,
      title: "Test",
      type: "poll",
      content: null,
      metadata: {},
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
    });

    const req = createRequest({ optionId: mockOptionId });
    const res = await POST(req, {
      params: Promise.resolve({ id: mockPostId }),
    });

    expect(res.status).toBe(200);
    expect(prismaDeepMock.post.update).toHaveBeenCalledWith({
      where: { id: mockPostId },
      data: {
        metadata: {
          ...mockMetadata,
          voters: { "user-1": mockOptionId },
          totalVotes: 1,
          options: [{ id: mockOptionId, text: "Yes", votes: 1 }],
        },
      },
    });
  });
});
