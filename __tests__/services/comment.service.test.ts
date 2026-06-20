// __tests__/services/comment.service.test.ts

/*
 * This test suite focuses on the core logic of the comment service, particularly:
 * - Creating comments with proper nesting rules (max 1 level of replies)
 * - Soft deleting comments by setting a deletedAt timestamp
 * - Handling comment support actions (toggle support status)
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  createComment,
  getIsolatedCommentThread,
  getPostComments,
  handleCommentAction,
  softDeleteComment,
  updateComment,
} from "@/services/comment.service";
import { Comment, CommentSupport, Post, PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

// ---------------------------------------------------------------------------
// Mock factories
// centralises shape so updates to Prisma models only need fixing in one place.
// ---------------------------------------------------------------------------

const buildPost = (overrides: Partial<Post> = {}): Post => ({
  id: "post-default",
  title: "Default post",
  type: "text",
  content: null,
  metadata: null,
  isAnonymous: false,
  authorId: "user-123",
  communityId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDummy: false,
  viewCount: 0,
  ...overrides,
});

const buildComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "comm-default",
  postId: "post-123",
  authorId: "user-123",
  parentId: null,
  content: "Default content",
  deletedAt: null,
  editedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDummy: false,
  isAnonymous: false,
  ...overrides,
});

const buildCommentSupport = (
  overrides: Partial<CommentSupport> = {},
): CommentSupport => ({
  userId: "user-123",
  commentId: "comm-default",
  createdAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------

describe("Comment Service", () => {
  const mockUserId = "user-123";
  const mockPostId = "post-123";

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    prismaDeepMock.friendship.findMany.mockResolvedValue([]);
  });

  describe("createComment", () => {
    it("should throw if post is not found", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue(null);

      await expect(
        createComment(mockUserId, mockPostId, {
          content: "Hello",
          isAnonymous: false,
        }),
      ).rejects.toThrow("Post not found");
    });

    it("should enforce max 1 level of nesting", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue(
        buildPost({ id: mockPostId }),
      );

      // Mock that the parent comment ALREADY has a parent (i.e., it's a level 2 reply)
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({
          id: "level-2-reply",
          parentId: "root-comment-id",
        }),
      );

      prismaDeepMock.comment.create.mockResolvedValue(
        buildComment({ id: "new-comment" }),
      );

      await createComment(mockUserId, mockPostId, {
        content: "Reply to a reply",
        parentId: "level-2-reply",
        isAnonymous: false,
      });

      // Verification: The service should have ignored 'level-2-reply' and attached
      // the new comment directly to 'root-comment-id' to keep nesting flat.
      expect(prismaDeepMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentId: "root-comment-id",
          }),
        }),
      );
    });

    it("should throw if posting anonymously on a profile post", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue(
        buildPost({ id: mockPostId, communityId: null }),
      );

      await expect(
        createComment(mockUserId, mockPostId, {
          content: "Hello",
          isAnonymous: true,
        }),
      ).rejects.toThrow("Cannot comment anonymously on profile posts");
    });

    it("should persist isAnonymous when creating an anonymous comment in a community", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue(
        buildPost({ id: mockPostId, communityId: "comm-1" }),
      );

      prismaDeepMock.comment.create.mockResolvedValue(
        buildComment({ id: "anon-comment" }),
      );

      await createComment(mockUserId, mockPostId, {
        content: "Anonymous reply",
        isAnonymous: true,
      });

      expect(prismaDeepMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isAnonymous: true,
            content: "Anonymous reply",
          }),
        }),
      );
    });
  });

  describe("softDeleteComment", () => {
    it("should throw if comment does not exist", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(null);

      await expect(softDeleteComment(mockUserId, "missing")).rejects.toThrow(
        "Comment not found",
      );
    });

    it("should throw if user is not the author", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({ id: "comm-1", authorId: "other-user" }),
      );

      await expect(softDeleteComment(mockUserId, "comm-1")).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should soft delete by setting deletedAt", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({ id: "comm-1", authorId: mockUserId }),
      );

      prismaDeepMock.comment.update.mockResolvedValue(
        buildComment({ id: "comm-1", deletedAt: new Date() }),
      );

      await softDeleteComment(mockUserId, "comm-1");

      expect(prismaDeepMock.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comm-1" },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe("updateComment", () => {
    it("should update content and set editedAt when the caller is the author", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({ id: "comm-1", authorId: mockUserId }),
      );
      prismaDeepMock.comment.update.mockResolvedValue(
        buildComment({ id: "comm-1", content: "Edited", editedAt: new Date() }),
      );

      const result = await updateComment(mockUserId, "comm-1", {
        content: "Edited",
      });

      expect(prismaDeepMock.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comm-1" },
          data: expect.objectContaining({
            content: "Edited",
            editedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.content).toBe("Edited");
    });

    it("should throw Unauthorized when the caller is not the author", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({ id: "comm-1", authorId: "other-user" }),
      );

      await expect(
        updateComment(mockUserId, "comm-1", { content: "Edited" }),
      ).rejects.toThrow("Unauthorized");

      expect(prismaDeepMock.comment.update).not.toHaveBeenCalled();
    });

    it("should throw when the comment has been soft-deleted", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({
          id: "comm-1",
          authorId: mockUserId,
          deletedAt: new Date(),
        }),
      );

      await expect(
        updateComment(mockUserId, "comm-1", { content: "Edited" }),
      ).rejects.toThrow("Cannot edit a deleted comment");

      expect(prismaDeepMock.comment.update).not.toHaveBeenCalled();
    });

    it("should throw when the comment does not exist", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(null);

      await expect(
        updateComment(mockUserId, "comm-1", { content: "Edited" }),
      ).rejects.toThrow("Comment not found");

      expect(prismaDeepMock.comment.update).not.toHaveBeenCalled();
    });
  });

  describe("softDeleteComment - moderation authorization", () => {
    it("should allow a global admin to soft-delete any comment", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue({
        ...buildComment({ id: "comm-admin", authorId: "other-user" }),
        post: { communityId: "comm-1" },
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.comment.findUnique>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: "ADMIN",
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.comment.update.mockResolvedValue(
        buildComment({ id: "comm-admin", deletedAt: new Date() }),
      );

      await softDeleteComment(mockUserId, "comm-admin");

      expect(prismaDeepMock.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comm-admin" },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it.each([["OWNER" as const], ["ADMIN" as const], ["MODERATOR" as const]])(
      "should allow a community %s to soft-delete a comment in their community",
      async (role) => {
        prismaDeepMock.comment.findUnique.mockResolvedValue({
          ...buildComment({ id: `comm-${role}`, authorId: "other-user" }),
          post: { communityId: "comm-1" },
        } as unknown as Awaited<
          ReturnType<typeof prismaMock.comment.findUnique>
        >);

        // Regular user - not a global admin
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: mockUserId,
          role: "USER",
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.communityMember.findUnique.mockResolvedValue({
          userId: mockUserId,
          communityId: "comm-1",
          role,
          status: "ACCEPTED",
        } as unknown as Awaited<
          ReturnType<typeof prismaMock.communityMember.findUnique>
        >);

        prismaDeepMock.comment.update.mockResolvedValue(
          buildComment({ id: `comm-${role}`, deletedAt: new Date() }),
        );

        await softDeleteComment(mockUserId, `comm-${role}`);

        expect(prismaDeepMock.comment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: `comm-${role}` },
            data: { deletedAt: expect.any(Date) },
          }),
        );
      },
    );

    it("should reject a plain community member trying to delete another user's comment", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue({
        ...buildComment({ id: "comm-plain", authorId: "other-user" }),
        post: { communityId: "comm-1" },
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.comment.findUnique>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: mockUserId,
        role: "USER",
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        userId: mockUserId,
        communityId: "comm-1",
        role: "USER",
        status: "ACCEPTED",
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.communityMember.findUnique>
      >);

      await expect(softDeleteComment(mockUserId, "comm-plain")).rejects.toThrow(
        "Unauthorized",
      );

      expect(prismaDeepMock.comment.update).not.toHaveBeenCalled();
    });
  });

  describe("handleCommentAction", () => {
    it("should toggle support status (add support)", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({ id: "comm-1" }),
      );
      prismaDeepMock.commentSupport.findUnique.mockResolvedValue(null); // Not supported yet

      const result = await handleCommentAction(mockUserId, "comm-1", "support");

      expect(prismaDeepMock.commentSupport.create).toHaveBeenCalled();
      expect(result.status).toBe("supported");
    });

    it("should toggle support status (remove support)", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildComment({ id: "comm-1" }),
      );
      prismaDeepMock.commentSupport.findUnique.mockResolvedValue(
        buildCommentSupport({ userId: mockUserId, commentId: "comm-1" }),
      ); // Already supported

      const result = await handleCommentAction(mockUserId, "comm-1", "support");

      expect(prismaDeepMock.commentSupport.delete).toHaveBeenCalled();
      expect(result.status).toBe("unsupported");
    });
  });

  describe("getPostComments - role badge resolution", () => {
    const buildCommentRow = (
      authorOverrides: Record<string, unknown> = {},
    ) => ({
      id: "comm-1",
      postId: "post-1",
      authorId: "user-1",
      parentId: null,
      content: "Hello",
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDummy: false,
      isAnonymous: false,
      author: {
        id: "user-1",
        name: "Alice",
        username: "alice",
        image: null,
        role: "USER",
        communities: [],
        ...authorOverrides,
      },
      _count: { supportedBy: 0, replies: 0 },
      supportedBy: [],
      replies: [],
    });

    beforeEach(() => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        hiddenComments: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    });

    it("should include globalRole on comment authors who are system admins", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        communityId: "comm-1",
      } as unknown as Awaited<ReturnType<typeof prismaMock.post.findUnique>>);

      prismaDeepMock.comment.findMany.mockResolvedValue([
        buildCommentRow({ role: "ADMIN" }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.comment.findMany>>);

      const comments = await getPostComments("post-1", "viewer-1");

      expect(comments[0].author.globalRole).toBe("ADMIN");
    });

    it("should resolve communityRole for elevated members commenting in their community", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        communityId: "comm-1",
      } as unknown as Awaited<ReturnType<typeof prismaMock.post.findUnique>>);

      prismaDeepMock.comment.findMany.mockResolvedValue([
        buildCommentRow({
          communities: [{ communityId: "comm-1", role: "MODERATOR" }],
        }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.comment.findMany>>);

      const comments = await getPostComments("post-1", "viewer-1");

      expect(comments[0].author.communityRole).toBe("MODERATOR");
    });

    it("should NOT set communityRole for profile posts (communityId = null)", async () => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        communityId: null,
      } as unknown as Awaited<ReturnType<typeof prismaMock.post.findUnique>>);

      prismaDeepMock.comment.findMany.mockResolvedValue([
        buildCommentRow({
          communities: [{ communityId: "comm-1", role: "OWNER" }],
        }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.comment.findMany>>);

      const comments = await getPostComments("post-1", "viewer-1");

      expect(comments[0].author.communityRole).toBeUndefined();
    });
  });

  describe("getIsolatedCommentThread", () => {
    const buildCommentRow = (overrides: Record<string, unknown> = {}) => ({
      id: "comm-root",
      postId: "post-1",
      authorId: "user-1",
      parentId: null,
      content: "Root comment",
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDummy: false,
      isAnonymous: false,
      author: {
        id: "user-1",
        name: "Alice",
        username: "alice",
        image: null,
        role: "USER",
        communities: [],
      },
      _count: { supportedBy: 0, replies: 0 },
      supportedBy: [],
      replies: [],
      ...overrides,
    });

    beforeEach(() => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        hiddenComments: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.post.findUnique.mockResolvedValue({
        communityId: "comm-1",
      } as unknown as Awaited<ReturnType<typeof prismaMock.post.findUnique>>);
    });

    it("should throw if the comment does not exist", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(null);

      await expect(
        getIsolatedCommentThread("missing-id", "viewer-1"),
      ).rejects.toThrow("Comment not found");
    });

    it("should return the thread with role data resolved against community context", async () => {
      prismaDeepMock.comment.findUnique.mockResolvedValue(
        buildCommentRow({
          author: {
            id: "user-1",
            name: "Alice",
            username: "alice",
            image: null,
            role: "USER",
            communities: [{ communityId: "comm-1", role: "OWNER" }],
          },
        }) as unknown as Awaited<
          ReturnType<typeof prismaMock.comment.findUnique>
        >,
      );

      const result = await getIsolatedCommentThread("comm-root", "viewer-1");

      expect(result.author.communityRole).toBe("OWNER");
      expect(result.id).toBe("comm-root");
    });
  });

  describe("getPostComments - anonymous comment masking", () => {
    const buildFullComment = (overrides: Record<string, unknown> = {}) => ({
      id: "comm-1",
      postId: "post-1",
      authorId: "author-1",
      parentId: null,
      content: "Hello",
      isAnonymous: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDummy: false,
      author: {
        id: "author-1",
        name: "Alice",
        username: "alice",
        image: null,
        role: "USER",
        communities: [],
      },
      _count: { supportedBy: 0, replies: 0 },
      supportedBy: [],
      replies: [],
      ...overrides,
    });

    beforeEach(() => {
      prismaDeepMock.post.findUnique.mockResolvedValue({
        communityId: "comm-1",
      } as unknown as Awaited<ReturnType<typeof prismaMock.post.findUnique>>);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
        hiddenComments: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.communityMember.findUnique.mockResolvedValue(null);

      prismaDeepMock.friendship.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.friendship.findMany>
        >,
      );
    });

    it("should mask anonymous comment author for non-privileged viewers", async () => {
      prismaDeepMock.comment.findMany.mockResolvedValue([
        buildFullComment(),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.comment.findMany>>);

      const comments = await getPostComments("post-1", "viewer-99");

      expect(comments[0].author.username).toBe("anonymous");
      expect(comments[0].author.id).toBe("anon");
      expect(comments[0].authorId).toBe("anon");
    });

    it("should NOT mask anonymous comment for the author themselves", async () => {
      prismaDeepMock.comment.findMany.mockResolvedValue([
        buildFullComment({
          authorId: "viewer-1",
          author: {
            id: "viewer-1",
            name: "Alice",
            username: "alice",
            image: null,
            role: "USER",
            communities: [],
          },
        }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.comment.findMany>>);

      const comments = await getPostComments("post-1", "viewer-1");

      expect(comments[0].author.username).toBe("alice");
      expect(comments[0].authorId).toBe("viewer-1");
    });

    it("should NOT mask anonymous comment for a global admin", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        hiddenComments: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.comment.findMany.mockResolvedValue([
        buildFullComment(),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.comment.findMany>>);

      const comments = await getPostComments("post-1", "admin-viewer");

      expect(comments[0].author.username).toBe("alice");
    });
  });
});
