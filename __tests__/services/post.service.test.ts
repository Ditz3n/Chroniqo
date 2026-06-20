// __tests__/services/post.service.test.ts

/*
 * This file tests the post service business logic.
 * It verifies constraints around anonymous posting, community membership validation,
 * and the CRUD operations for post drafts.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  createPost,
  deleteDraft,
  deletePost,
  getPostById,
  getUserDrafts,
  saveDraft,
} from "@/services/post.service";
import {
  CommunityMember,
  Post,
  PostDraft,
  Prisma,
  PrismaClient,
  User,
} from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import { TEST_IDS } from "../utils/test-constants";
import { createMockUser } from "../utils/test-utils";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
type CommunityFindUniqueResult = Awaited<
  ReturnType<typeof prismaMock.community.findUnique>
>;

describe("Post Service", () => {
  const mockUserId = TEST_IDS.author;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPost", () => {
    it("should throw if posting anonymously to a personal profile", async () => {
      await expect(
        createPost(mockUserId, {
          title: "Test",
          type: "text",
          communityId: null, // Profile
          isAnonymous: true,
        }),
      ).rejects.toThrow("Cannot post anonymously to your personal profile");
    });

    it("should throw if user is not an accepted member of a private community", async () => {
      // Membership is missing and target community is private.
      prismaDeepMock.communityMember.findUnique.mockResolvedValue(null);
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
        isPrivate: true,
      } as unknown as CommunityFindUniqueResult);

      await expect(
        createPost(mockUserId, {
          title: "Test",
          type: "text",
          communityId: "comm-1",
          isAnonymous: false,
        }),
      ).rejects.toThrow(
        "You must be an accepted member of this private community to post",
      );
    });

    it("should throw if user's private community membership is PENDING", async () => {
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "comm-1",
        status: "PENDING",
      } as unknown as CommunityMember);
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
        isPrivate: true,
      } as unknown as CommunityFindUniqueResult);

      await expect(
        createPost(mockUserId, {
          title: "Test",
          type: "text",
          communityId: "comm-1",
          isAnonymous: false,
        }),
      ).rejects.toThrow(
        "You must be an accepted member of this private community to post",
      );
    });

    it("should create a post successfully on a profile", async () => {
      const mockPost = { id: "post-1", title: "My Profile Post" };
      prismaDeepMock.post.create.mockResolvedValue(mockPost as unknown as Post);

      const result = await createPost(mockUserId, {
        title: "My Profile Post",
        type: "text",
        communityId: null,
        isAnonymous: false,
      });

      expect(prismaDeepMock.post.create).toHaveBeenCalledWith({
        data: {
          authorId: mockUserId,
          communityId: null,
          title: "My Profile Post",
          type: "text",
          content: null,
          metadata: Prisma.JsonNull,
          isAnonymous: false,
        },
      });
      expect(result.id).toBe("post-1");
    });

    it("should create a post successfully in a community", async () => {
      // Mock successful membership
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "comm-1",
        status: "ACCEPTED",
      } as unknown as CommunityMember);

      const mockPost = { id: "post-2", title: "Comm Post" };
      prismaDeepMock.post.create.mockResolvedValue(mockPost as unknown as Post);

      const result = await createPost(mockUserId, {
        title: "Comm Post",
        type: "text",
        communityId: "comm-1",
        isAnonymous: true,
      });

      expect(prismaDeepMock.post.create).toHaveBeenCalledWith({
        data: {
          authorId: mockUserId,
          communityId: "comm-1",
          title: "Comm Post",
          type: "text",
          content: null,
          metadata: Prisma.JsonNull,
          isAnonymous: true,
        },
      });
      expect(result.id).toBe("post-2");
    });
  });

  describe("getUserDrafts", () => {
    it("should return user drafts ordered by updatedAt", async () => {
      const mockDrafts = [{ id: "draft-1" }];
      prismaDeepMock.postDraft.findMany.mockResolvedValue(
        mockDrafts as unknown as PostDraft[],
      );

      const result = await getUserDrafts(mockUserId);

      expect(prismaDeepMock.postDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: mockUserId },
          orderBy: { updatedAt: "desc" },
        }),
      );
      expect(result).toEqual(mockDrafts);
    });
  });

  describe("saveDraft", () => {
    it("should create a new draft if no id is provided", async () => {
      const mockDraft = { id: "draft-new", title: "New Draft" };
      prismaDeepMock.postDraft.create.mockResolvedValue(
        mockDraft as unknown as PostDraft,
      );

      const result = await saveDraft(mockUserId, {
        title: "New Draft",
        type: "text",
      });

      expect(prismaDeepMock.postDraft.create).toHaveBeenCalled();
      expect(result.id).toBe("draft-new");
    });

    it("should throw if updating a draft that does not exist", async () => {
      prismaDeepMock.postDraft.findUnique.mockResolvedValue(null);

      await expect(
        saveDraft(mockUserId, { id: "missing-id", type: "text" }),
      ).rejects.toThrow("Draft not found");
    });

    it("should throw if updating a draft owned by another user", async () => {
      prismaDeepMock.postDraft.findUnique.mockResolvedValue({
        id: "draft-other",
        authorId: "different-user",
      } as unknown as PostDraft);

      await expect(
        saveDraft(mockUserId, { id: "draft-other", type: "text" }),
      ).rejects.toThrow("Unauthorized");
    });

    it("should update the draft successfully if ownership matches", async () => {
      prismaDeepMock.postDraft.findUnique.mockResolvedValue({
        id: "draft-1",
        authorId: mockUserId,
      } as unknown as PostDraft);

      const mockUpdated = { id: "draft-1", title: "Updated" };
      prismaDeepMock.postDraft.update.mockResolvedValue(
        mockUpdated as unknown as PostDraft,
      );

      const result = await saveDraft(mockUserId, {
        id: "draft-1",
        title: "Updated",
        type: "text",
      });

      expect(prismaDeepMock.postDraft.update).toHaveBeenCalledWith({
        where: { id: "draft-1" },
        data: expect.objectContaining({ title: "Updated" }),
      });
      expect(result.title).toBe("Updated");
    });
  });

  describe("deleteDraft", () => {
    it("should throw if draft is not found", async () => {
      prismaDeepMock.postDraft.findUnique.mockResolvedValue(null);

      await expect(deleteDraft(mockUserId, "missing")).rejects.toThrow(
        "Draft not found",
      );
    });

    it("should throw if user does not own the draft", async () => {
      prismaDeepMock.postDraft.findUnique.mockResolvedValue({
        id: "draft-1",
        authorId: "different-user",
      } as unknown as PostDraft);

      await expect(deleteDraft(mockUserId, "draft-1")).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should delete the draft successfully", async () => {
      prismaDeepMock.postDraft.findUnique.mockResolvedValue({
        id: "draft-1",
        authorId: mockUserId,
      } as unknown as PostDraft);

      prismaDeepMock.postDraft.delete.mockResolvedValue(
        {} as unknown as PostDraft,
      );

      const result = await deleteDraft(mockUserId, "draft-1");

      expect(prismaDeepMock.postDraft.delete).toHaveBeenCalledWith({
        where: { id: "draft-1" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("deletePost", () => {
    it("should allow author to delete own post without creating notification", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-1",
        title: "My post",
        authorId: mockUserId,
        communityId: "comm-1",
        community: { name: "Test Community" },
      } as unknown as Post);

      prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

      const result = await deletePost(mockUserId, "post-1");

      expect(prismaDeepMock.post.delete).toHaveBeenCalledWith({
        where: { id: "post-1" },
      });
      expect(prismaDeepMock.notification.create).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should reject deletion by non-author without moderation role", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-2",
        title: "Another post",
        authorId: "author-2",
        communityId: "comm-1",
        community: { name: "Test Community" },
      } as unknown as Post);

      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "comm-1",
        role: "USER",
        status: "ACCEPTED",
      } as unknown as CommunityMember);

      await expect(deletePost(mockUserId, "post-2")).rejects.toThrow(
        "Unauthorized",
      );
      expect(prismaDeepMock.post.delete).not.toHaveBeenCalled();
      expect(prismaDeepMock.notification.create).not.toHaveBeenCalled();
    });

    it("should allow moderator to delete and notify post author", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-3",
        title: "Rule-breaking title",
        authorId: "author-3",
        communityId: "comm-1",
        community: { name: "ChronicSupport" },
      } as unknown as Post);

      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "comm-1",
        role: "MODERATOR",
        status: "ACCEPTED",
      } as unknown as CommunityMember);

      prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

      const result = await deletePost(mockUserId, "post-3");

      expect(prismaDeepMock.post.delete).toHaveBeenCalledWith({
        where: { id: "post-3" },
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "author-3",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.moderation_message_deleted"',
          ),
        },
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: expect.stringContaining('"community":"ChronicSupport"'),
          message: expect.stringContaining('"post":"Rule-breaking title"'),
        }),
      });
      expect(result.success).toBe(true);
    });

    it("should include moderation reason in notification when provided", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-4",
        title: "Needs cleanup",
        authorId: "author-4",
        communityId: "comm-1",
        community: { name: "ReportTest" },
      } as unknown as Post);

      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "comm-1",
        role: "MODERATOR",
        status: "ACCEPTED",
      } as unknown as CommunityMember);

      prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

      const result = await deletePost(
        mockUserId,
        "post-4",
        "Violation of community rules",
      );

      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "author-4",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.moderation_message_deleted_with_reason"',
          ),
        },
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: expect.stringContaining('"community":"ReportTest"'),
          message: expect.stringContaining(
            '"reason":"Violation of community rules"',
          ),
        }),
      });
      expect(result.success).toBe(true);
    });

    it("should allow a global admin to delete a community post using community notification keys", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-gadmin-comm",
        title: "Admin target",
        authorId: "author-a",
        communityId: "comm-1",
        community: { name: "ChronicCare" },
      } as unknown as Post);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: "ADMIN",
      } as unknown as User);

      prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

      const result = await deletePost(mockUserId, "post-gadmin-comm");

      expect(prismaDeepMock.post.delete).toHaveBeenCalledWith({
        where: { id: "post-gadmin-comm" },
      });
      // Community present → uses existing community moderation notification keys
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author-a",
          type: "SYSTEM",
          title: expect.stringContaining('"key":"topNavbar.moderation_title"'),
          message: expect.stringContaining(
            '"key":"topNavbar.moderation_message_deleted"',
          ),
        }),
      });
      expect(result.success).toBe(true);
    });

    it("should allow a global admin to delete a profile post using admin notification keys", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-gadmin-profile",
        title: "Profile post target",
        authorId: "author-b",
        communityId: null,
        community: null,
      } as unknown as Post);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: "ADMIN",
      } as unknown as User);

      prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

      const result = await deletePost(mockUserId, "post-gadmin-profile");

      expect(prismaDeepMock.post.delete).toHaveBeenCalledWith({
        where: { id: "post-gadmin-profile" },
      });
      // No community → uses the new admin-specific notification keys
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author-b",
          type: "SYSTEM",
          title: expect.stringContaining(
            '"key":"topNavbar.admin_moderation_title"',
          ),
          message: expect.stringContaining(
            '"key":"topNavbar.admin_message_deleted"',
          ),
        }),
      });
      expect(result.success).toBe(true);
    });

    it("should include reason in admin notification when deleting a profile post with a reason", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-gadmin-reason",
        title: "Flagged post",
        authorId: "author-c",
        communityId: null,
        community: null,
      } as unknown as Post);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: "ADMIN",
      } as unknown as User);

      prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

      await deletePost(
        mockUserId,
        "post-gadmin-reason",
        "Violates platform guidelines",
      );

      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: expect.stringContaining(
            '"key":"topNavbar.admin_moderation_title"',
          ),
          message: expect.stringContaining(
            '"key":"topNavbar.admin_message_deleted_with_reason"',
          ),
        }),
      });
      expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: expect.stringContaining(
            '"reason":"Violates platform guidelines"',
          ),
        }),
      });
    });

    it.each([["OWNER" as const], ["ADMIN" as const]])(
      "should allow a community %s to delete a post and notify the author",
      async (role) => {
        prismaDeepMock.post.findUnique.mockResolvedValue({
          id: `post-${role.toLowerCase()}`,
          title: `${role} deleted`,
          authorId: "author-role",
          communityId: "comm-1",
          community: { name: "HealthHub" },
        } as unknown as Post);

        // Not a global admin - falls through to community membership check
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: mockUserId,
          role: "USER",
        } as unknown as User);

        prismaDeepMock.communityMember.findUnique.mockResolvedValue({
          userId: mockUserId,
          communityId: "comm-1",
          role,
          status: "ACCEPTED",
        } as unknown as CommunityMember);

        prismaDeepMock.post.delete.mockResolvedValue({} as unknown as Post);

        const result = await deletePost(
          mockUserId,
          `post-${role.toLowerCase()}`,
        );

        expect(prismaDeepMock.post.delete).toHaveBeenCalled();
        expect(prismaDeepMock.notification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: "author-role",
            type: "SYSTEM",
            title: expect.stringContaining('"community":"HealthHub"'),
          }),
        });
        expect(result.success).toBe(true);
      },
    );

    it("should reject deletion of a profile post by a non-admin, non-author user", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        id: "post-denied",
        title: "Someone's profile post",
        authorId: "different-author",
        communityId: null,
        community: null,
      } as unknown as Post);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: "USER",
      } as unknown as User);

      await expect(deletePost(mockUserId, "post-denied")).rejects.toThrow(
        "Unauthorized",
      );
      expect(prismaDeepMock.post.delete).not.toHaveBeenCalled();
      expect(prismaDeepMock.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("createPost - Poll Initialization", () => {
    it("should securely initialize poll metadata", async () => {
      const mockUserId = "user-1";
      const dto = {
        title: "My Poll",
        type: "poll" as const,
        isAnonymous: false,
        metadata: {
          durationHours: 48,
          options: [
            { id: "opt1", text: "A", votes: 100 },
            { id: "opt2", text: "B", votes: 999 },
          ],
        },
      };

      prismaDeepMock.post.create.mockResolvedValueOnce({
        isDummy: false,
        id: "post-1",
        authorId: mockUserId,
        communityId: null,
        title: "My Poll",
        type: "poll",
        content: null,
        metadata: {},
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0,
      });

      await createPost(mockUserId, dto);

      expect(prismaDeepMock.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "poll",
            metadata: expect.objectContaining({
              voters: {},
              totalVotes: 0,
              durationHours: 48,
              options: [
                { id: "opt1", text: "A", votes: 0 },
                { id: "opt2", text: "B", votes: 0 },
              ], // Votes must be forced to 0
            }),
          }),
        }),
      );

      // Verify closesAt was generated
      const callData = prismaDeepMock.post.create.mock.calls[0][0].data
        .metadata as Record<string, unknown>;
      expect(callData.closesAt).toBeDefined();
    });
  });

  describe("getPostById - Metadata Scrubbing", () => {
    beforeEach(() => {
      prismaDeepMock.post.update.mockResolvedValue({} as unknown as Post);
    });

    it("should scrub the voters object and inject userVote", async () => {
      const mockUserId = "user-1";
      const mockPost = {
        isDummy: false,
        id: "post-1",
        authorId: "author-1",
        communityId: null,
        title: "Test Poll",
        type: "poll",
        content: null,
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          voters: {
            "user-1": "opt-2",
            "user-2": "opt-1",
          },
          totalVotes: 2,
        },
        author: {
          id: "author-1",
          name: "Author",
          username: "author",
          image: null,
          role: "USER" as const,
          communities: [],
          anonymousIdentities: [],
        },
        _count: { comments: 0, supportedBy: 0 },
        savedBy: [],
        hiddenBy: [],
        supportedBy: [],
        viewCount: 0,
      };

      prismaDeepMock.post.findUnique.mockResolvedValueOnce(mockPost);
      prismaDeepMock.user.findUnique.mockResolvedValueOnce(
        createMockUser({
          id: "author-1",
          name: "Author",
          username: "author",
          email: "author@test.com",
          onboarded: true,
        }) as unknown as User,
      );
      prismaDeepMock.friendship.findFirst.mockResolvedValueOnce(null);

      const result = await getPostById(mockUserId, "post-1");

      // Voters map should be deleted so other users' votes don't leak to client
      expect(
        (result.metadata as Record<string, unknown>).voters,
      ).toBeUndefined();

      // The specific user's vote should be injected
      expect((result.metadata as Record<string, unknown>).userVote).toBe(
        "opt-2",
      );
    });
  });

  describe("getPostById - role badge resolution", () => {
    const buildPostMock = (overrides: Record<string, unknown> = {}) => ({
      isDummy: false,
      id: "post-1",
      title: "Test",
      type: "text",
      content: null,
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
      communityId: "comm-1",
      community: {
        id: "comm-1",
        name: "TestComm",
        image: null,
        isPrivate: false,
      },
      _count: { comments: 0, supportedBy: 0 },
      savedBy: [],
      hiddenBy: [],
      supportedBy: [],
      author: {
        id: "author-1",
        name: "Alice",
        username: "alice",
        image: null,
        role: "USER" as const,
        communities: [] as {
          communityId: string;
          role: "MODERATOR" | "ADMIN" | "OWNER";
        }[],
        anonymousIdentities: [],
      },
      ...overrides,
    });

    const mockViewer = createMockUser({
      id: "viewer-1",
      email: "viewer@test.com",
    });

    beforeEach(() => {
      prismaDeepMock.post.update.mockResolvedValue({} as unknown as Post);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue(null);
      prismaDeepMock.friendship.findFirst.mockResolvedValue(null);
      prismaDeepMock.user.findUnique.mockResolvedValue(
        mockViewer as unknown as User,
      );
    });

    it("should include globalRole on the returned author for a system admin", async () => {
      const post = buildPostMock({
        author: {
          id: "author-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "ADMIN" as const,
          communities: [],
          anonymousIdentities: [],
        },
      });
      prismaDeepMock.post.findUnique.mockResolvedValue(post as unknown as Post);

      const result = await getPostById("viewer-1", "post-1");

      expect((result.author as Record<string, unknown>).globalRole).toBe(
        "ADMIN",
      );
    });

    it("should resolve communityRole when author is an elevated member of the post's community", async () => {
      const post = buildPostMock({
        author: {
          id: "author-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "USER" as const,
          communities: [{ communityId: "comm-1", role: "OWNER" as const }],
          anonymousIdentities: [],
        },
      });
      prismaDeepMock.post.findUnique.mockResolvedValue(post as unknown as Post);

      const result = await getPostById("viewer-1", "post-1");

      expect((result.author as Record<string, unknown>).communityRole).toBe(
        "OWNER",
      );
    });

    it("should strip role data when the post is anonymous and the viewer cannot see the author", async () => {
      const post = buildPostMock({
        isAnonymous: true,
        author: {
          id: "author-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "ADMIN" as const,
          communities: [{ communityId: "comm-1", role: "OWNER" as const }],
          anonymousIdentities: [
            {
              id: "anon-1",
              communityId: "comm-1",
              postId: "post-1",
              name: "Anonymous",
              image: null,
            },
          ],
        },
      });
      prismaDeepMock.post.findUnique.mockResolvedValue(post as unknown as Post);

      const result = await getPostById("viewer-1", "post-1");

      expect(result.author.id).toBe("anon");
      expect(
        (result.author as Record<string, unknown>).globalRole,
      ).toBeUndefined();
      expect(
        (result.author as Record<string, unknown>).communityRole,
      ).toBeUndefined();
    });
  });
});
