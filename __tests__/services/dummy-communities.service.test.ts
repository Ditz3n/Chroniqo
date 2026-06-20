// __tests__/services/dummy-communities.service.test.ts
import { prisma } from "@/lib/prisma";
import { generateDummyCommunities } from "@/services/dummy/dummy-communities.service";

// Mock the constant data so the loop only runs once for our specific test scenario
jest.mock("@/services/dummy/data", () => ({
  DUMMY_COMMUNITIES: [{ name: "HerniatedDiscs", description: "Test" }],
}));

// Mock external dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    community: { findUnique: jest.fn(), create: jest.fn() },
    communityMember: { findMany: jest.fn() },
    communityAnonymousIdentity: { upsert: jest.fn() },
  },
}));

jest.mock("@/services/chat.service", () => ({
  createCommunityConversation: jest.fn(),
}));

jest.mock("@/services/dummy/dummy-media.service", () => ({
  uploadDummyMedia: jest
    .fn()
    .mockResolvedValue("https://fake-url.com/image.jpg"),
}));

describe("generateDummyCommunities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should backfill anonymous identities for existing communities", async () => {
    // 1. Mock the initiator
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "initiator-id",
      isDummy: false,
    });

    // 2. Mock that the community already exists
    (prisma.community.findUnique as jest.Mock).mockResolvedValue({
      id: "existing-community-id",
      name: "HerniatedDiscs",
    });

    // 3. Mock existing members in that community
    (prisma.communityMember.findMany as jest.Mock).mockResolvedValue([
      { userId: "dummy-user-1", communityId: "existing-community-id" },
      { userId: "dummy-user-2", communityId: "existing-community-id" },
    ]);

    const dummyUsers = [
      { id: "dummy-owner-id" },
      { id: "dummy-user-1" },
      { id: "dummy-user-2" },
    ] as Parameters<typeof generateDummyCommunities>[0];

    // Execute
    await generateDummyCommunities(dummyUsers);

    // Verify backfill logic was triggered
    expect(prisma.communityMember.findMany).toHaveBeenCalledWith({
      where: { communityId: "existing-community-id" },
    });

    // We expect upsert to be called exactly twice (once for each existing member)
    expect(prisma.communityAnonymousIdentity.upsert).toHaveBeenCalledTimes(2);

    // Verify the arguments for the first user
    expect(prisma.communityAnonymousIdentity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_communityId: {
            userId: "dummy-user-1",
            communityId: "existing-community-id",
          },
        },
      }),
    );
  });
});
