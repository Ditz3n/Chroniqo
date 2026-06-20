// __tests__/services/community.service.test.ts

/*
 * This file tests the community service business logic.
 * It verifies recommendation logic, community creation, retrieval,
 * membership toggling, and admin-only update/delete operations.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  createCommunity,
  deleteCommunity,
  getCommunitiesOverview,
  getCommunityByName,
  toggleCommunityMembership,
  updateCommunity,
} from "@/services/community.service";
import {
  Comment,
  Community,
  CommunityMember,
  CommunityMute,
  PrismaClient,
  User,
} from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Community Service", () => {
  const mockUserId = "user-123";

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCommunitiesOverview", () => {
    beforeEach(() => {
      prismaDeepMock.blockedCommunity.findMany.mockResolvedValue([]);
    });

    it("should return recommendations based on user conditions and medications", async () => {
      // Mock user with tags
      prismaDeepMock.hiddenCommunity.findMany.mockResolvedValue([]);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        conditions: ["diabetes", "anxiety"],
        medications: ["metformin"],
      } as unknown as User);

      // Mock public communities (add isActive: true)
      const mockCommunities = [
        {
          id: "c1",
          name: "Diabetes Support",
          description: "For diabetics",
          isPrivate: false,
          isActive: true,
          members: [],
        },
        {
          id: "c2",
          name: "General Health",
          description: "Healthy living",
          isPrivate: false,
          isActive: true,
          members: [],
        },
        {
          id: "c3",
          name: "Mental Health",
          description: "Coping with anxiety",
          isPrivate: false,
          isActive: true,
          members: [],
        },
      ];

      prismaDeepMock.community.findMany.mockResolvedValue(
        mockCommunities as unknown as (Community & {
          _count: { members: number };
        })[],
      );

      const result = await getCommunitiesOverview(mockUserId);

      // "diabetes" matches c1, "anxiety" matches c3
      expect(result.recommended).toHaveLength(2);
      expect(result.recommended.map((c) => c.id)).toEqual(["c1", "c3"]);

      // "all" should contain the remainder (others) because userTags > 0
      expect(result.all).toHaveLength(1);
      expect(result.all[0].id).toBe("c2");
    });

    it("should return all communities in 'all' and none in 'recommended' if user has no tags", async () => {
      prismaDeepMock.hiddenCommunity.findMany.mockResolvedValue([]);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        conditions: [],
        medications: [],
      } as unknown as User);

      const mockCommunities = [
        {
          id: "c1",
          name: "Diabetes Support",
          description: "For diabetics",
          isPrivate: false,
          isActive: true,
          members: [],
        },
      ];

      prismaDeepMock.community.findMany.mockResolvedValue(
        mockCommunities as unknown as (Community & {
          _count: { members: number };
        })[],
      );

      const result = await getCommunitiesOverview(mockUserId);

      expect(result.recommended).toHaveLength(0);
      expect(result.all).toHaveLength(1);
    });
  });

  describe("createCommunity", () => {
    const validData = {
      name: "New_Community",
      description: "A great place",
      category: "chronic" as const,
      isPrivate: false,
    };

    it("should throw an error if the community name is already taken", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "existing-id",
        name: "New_Community",
      } as unknown as Community);

      await expect(createCommunity(mockUserId, validData)).rejects.toThrow(
        "Community name is already taken",
      );
    });

    it("should create a community and assign the creator as OWNER", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue(null);

      const mockCreatedCommunity = { id: "new-c-id", ...validData };
      prismaDeepMock.community.create.mockResolvedValue(
        mockCreatedCommunity as unknown as Community,
      );

      const result = await createCommunity(mockUserId, validData);

      expect(prismaDeepMock.community.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...validData,
          members: {
            create: {
              userId: mockUserId,
              role: "OWNER",
            },
          },
          anonymousIdentities: expect.objectContaining({
            create: expect.any(Object),
          }),
        }),
      });
      expect(result.id).toBe("new-c-id");
    });
  });

  describe("getCommunityByName", () => {
    it("should throw if community is not found", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue(null);
      await expect(getCommunityByName("Missing", mockUserId)).rejects.toThrow(
        "Community not found",
      );
    });

    it("should throw if community is inactive and user is not an admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Hidden",
        isActive: false,
        members: [{ role: "USER", status: "ACCEPTED" }],
        _count: { members: 1, posts: 0 },
      } as unknown as Community);

      await expect(getCommunityByName("Hidden", mockUserId)).rejects.toThrow(
        "Community is currently inactive or hidden",
      );
    });

    it("should return community details for an active community", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "ActiveComm",
        isActive: true,
        isPrivate: false,
        category: "chronic",
        members: [{ role: "USER", status: "ACCEPTED" }],
        _count: { members: 5, posts: 2 },
      } as unknown as Community);

      // Mock the new leaders query to return an empty array
      prismaDeepMock.communityMember.findMany.mockResolvedValue([]);

      const result = await getCommunityByName("ActiveComm", mockUserId);
      expect(result.name).toBe("ActiveComm");
      expect(result.membership.status).toBe("ACCEPTED");
      expect(result.stats.members).toBe(5);
      expect(result.leaders).toEqual([]);
    });
  });

  describe("toggleCommunityMembership", () => {
    it("should throw if community is not found", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue(null);
      await expect(
        toggleCommunityMembership("Missing", mockUserId),
      ).rejects.toThrow("Community not found");
    });

    it("should delete membership if user is already a member", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
        isPrivate: false,
      } as unknown as Community);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "c1",
      } as unknown as CommunityMember);

      const result = await toggleCommunityMembership("Test", mockUserId);

      expect(prismaDeepMock.communityMember.delete).toHaveBeenCalled();
      expect(result.status).toBe("NONE");
    });

    it("should create PENDING membership if community is private", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
        isPrivate: true,
      } as unknown as Community);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue(null);

      const result = await toggleCommunityMembership("Test", mockUserId);

      expect(prismaDeepMock.communityMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PENDING" }),
        }),
      );
      expect(result.status).toBe("PENDING");
    });

    it("should create ACCEPTED membership if community is public", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
        isPrivate: false,
      } as unknown as Community);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue(null);

      const result = await toggleCommunityMembership("Test", mockUserId);

      expect(prismaDeepMock.communityMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "ACCEPTED" }),
        }),
      );
      expect(result.status).toBe("ACCEPTED");
    });
  });

  describe("updateCommunity", () => {
    it("should throw if user is not an admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        members: [{ role: "USER" }],
      } as unknown as Community);

      await expect(
        updateCommunity("Test", mockUserId, { isActive: false }),
      ).rejects.toThrow("Unauthorized");
    });

    it("should update community if user is an admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        members: [{ role: "ADMIN" }],
      } as unknown as Community);

      await updateCommunity("Test", mockUserId, { description: "New desc" });

      expect(prismaDeepMock.community.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { description: "New desc" },
      });
    });
  });

  describe("deleteCommunity", () => {
    it("should throw if user is not an admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        members: [{ role: "USER" }],
      } as unknown as Community);

      await expect(deleteCommunity("Test", mockUserId)).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should delete community if user is an admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        members: [{ role: "ADMIN" }],
      } as unknown as Community);

      const result = await deleteCommunity("Test", mockUserId);

      expect(prismaDeepMock.community.delete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("getCommunityMembers", () => {
    it("should throw if user lacks permissions", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as CommunityMember);

      const { getCommunityMembers } =
        await import("@/services/community.service");
      await expect(getCommunityMembers("Test", mockUserId)).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should return members if user is a MODERATOR or higher", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        role: "MODERATOR",
      } as unknown as CommunityMember);

      prismaDeepMock.communityMember.findMany.mockResolvedValue([
        {
          userId: "u1",
          role: "USER",
          status: "ACCEPTED",
          joinedAt: new Date(),
          user: {},
        },
      ] as unknown as CommunityMember[]);

      const { getCommunityMembers } =
        await import("@/services/community.service");
      const result = await getCommunityMembers("Test", mockUserId);
      expect(result.members).toHaveLength(1);
    });
  });

  describe("updateMemberRole", () => {
    it("should throw if a moderator attempts to change roles", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "MODERATOR",
      } as unknown as CommunityMember); // Requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // Target

      const { updateMemberRole } = await import("@/services/community.service");
      await expect(
        updateMemberRole("Test", "target", "ADMIN", mockUserId),
      ).rejects.toThrow("Moderators cannot change roles");
    });

    it("should allow an owner to transfer ownership", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
        username: "leaving-owner",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      } as unknown as CommunityMember); // Requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "ADMIN",
      } as unknown as CommunityMember); // Target

      prismaDeepMock.communityMember.findFirst.mockResolvedValueOnce({
        userId: mockUserId,
        communityId: "c1",
        role: "OWNER",
      } as unknown as CommunityMember);

      prismaDeepMock.$transaction.mockResolvedValueOnce([{}, {}] as unknown as [
        CommunityMember,
        CommunityMember,
      ]);

      const { updateMemberRole } = await import("@/services/community.service");
      const result = await updateMemberRole(
        "Test",
        "target",
        "OWNER",
        mockUserId,
      );
      expect(result.success).toBe(true);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.member_owner_transferred_message"',
          ),
        }),
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: expect.stringContaining('"actor":"leaving-owner"'),
        }),
      });
    });

    it("should notify target user when promoted to admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      } as unknown as CommunityMember); // requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // target

      const { updateMemberRole } = await import("@/services/community.service");
      const result = await updateMemberRole(
        "Test",
        "target",
        "ADMIN",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(prismaDeepMock.communityMember.update).toHaveBeenCalledWith({
        where: {
          userId_communityId: { userId: "target", communityId: "c1" },
        },
        data: { role: "ADMIN" },
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          message: expect.stringContaining(
            '"key":"topNavbar.member_role_updated_admin_message"',
          ),
        }),
      });
    });

    it("should notify target user when promoted to moderator", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "ADMIN",
      } as unknown as CommunityMember); // requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // target

      const { updateMemberRole } = await import("@/services/community.service");
      const result = await updateMemberRole(
        "Test",
        "target",
        "MODERATOR",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          message: expect.stringContaining(
            '"key":"topNavbar.member_role_updated_moderator_message"',
          ),
        }),
      });
    });

    it("should notify target user when role is reverted to user", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      } as unknown as CommunityMember); // requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "MODERATOR",
      } as unknown as CommunityMember); // target

      const { updateMemberRole } = await import("@/services/community.service");
      const result = await updateMemberRole(
        "Test",
        "target",
        "USER",
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(prismaDeepMock.communityMember.update).toHaveBeenCalledWith({
        where: {
          userId_communityId: { userId: "target", communityId: "c1" },
        },
        data: { role: "USER" },
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          message: expect.stringContaining(
            '"key":"topNavbar.member_role_updated_user_message"',
          ),
        }),
      });
    });
  });

  describe("kickMember", () => {
    it("should throw if an admin tries to kick an owner", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "ADMIN",
      } as unknown as CommunityMember); // Requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "OWNER",
      } as unknown as CommunityMember); // Target

      const { kickMember } = await import("@/services/community.service");
      await expect(kickMember("Test", "target", mockUserId)).rejects.toThrow(
        "Admins cannot kick other Admins or Owners",
      );
    });

    it("should allow a moderator to kick a user", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "MODERATOR",
      } as unknown as CommunityMember); // Requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // Target

      prismaDeepMock.communityMember.delete.mockResolvedValueOnce(
        {} as unknown as CommunityMember,
      );

      const { kickMember } = await import("@/services/community.service");
      const result = await kickMember("Test", "target", mockUserId);
      expect(result.success).toBe(true);
      expect(prismaDeepMock.communityMember.delete).toHaveBeenCalled();
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.member_kicked_message"',
          ),
        }),
      });
    });

    it("should include reason in kick notification when provided", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "MODERATOR",
      } as unknown as CommunityMember); // Requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // Target

      prismaDeepMock.communityMember.delete.mockResolvedValueOnce(
        {} as unknown as CommunityMember,
      );

      const { kickMember } = await import("@/services/community.service");
      const result = await kickMember(
        "Test",
        "target",
        mockUserId,
        undefined,
        "Repeated spam",
      );

      expect(result.success).toBe(true);
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          message: expect.stringContaining(
            '"key":"topNavbar.member_kicked_message_with_reason"',
          ),
        }),
      });
    });
  });

  describe("muteMember", () => {
    it("should mute a regular member and create a mute notification", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "MODERATOR",
      } as unknown as CommunityMember); // requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // target

      prismaDeepMock.communityMute.upsert.mockResolvedValue({
        communityId: "c1",
        userId: "target",
      } as unknown as CommunityMute);

      const { muteMember } = await import("@/services/community.service");
      const result = await muteMember("Test", "target", mockUserId, 24, "Spam");

      expect(result.success).toBe(true);
      expect(prismaDeepMock.communityMute.upsert).toHaveBeenCalled();
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.member_muted_message_with_reason"',
          ),
        }),
      });
    });
  });

  describe("banMember", () => {
    it("should ban a regular member and create a ban notification", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "c1",
        name: "Test",
      } as unknown as Community);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as User);
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "MODERATOR",
      } as unknown as CommunityMember); // requester
      prismaDeepMock.communityMember.findUnique.mockResolvedValueOnce({
        role: "USER",
      } as unknown as CommunityMember); // target

      prismaDeepMock.comment.findMany.mockResolvedValue([] as Comment[]);
      prismaDeepMock.$transaction.mockResolvedValue([] as unknown as unknown[]);

      const { banMember } = await import("@/services/community.service");
      const result = await banMember(
        "Test",
        "target",
        mockUserId,
        null,
        "Harassment",
      );

      expect(result.success).toBe(true);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "target",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.member_banned_message_with_reason"',
          ),
        }),
      });
    });
  });
});
