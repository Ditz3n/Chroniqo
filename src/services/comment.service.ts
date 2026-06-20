// src/services/comment.service.ts
import { CreateCommentDTO, UpdateCommentDTO } from "@/lib/dtos/comment.dto";
import { prisma } from "@/lib/prisma";
import { getTodayUTC } from "@/lib/utils/mood-ring";
import { CommentWithRelations } from "@/types/app-types";
import { CommunityRole } from "@prisma/client";

const toI18nPayload = (key: string, params: Record<string, string>) =>
  JSON.stringify({ key, params });

const getCommentAuthorSelect = () => ({
  id: true,
  name: true,
  username: true,
  image: true,
  avatarEmoji: true,
  avatarBgColor: true,
  role: true,
  emailVerified: true,
  communities: {
    where: { role: { in: ["MODERATOR", "ADMIN", "OWNER"] as CommunityRole[] } },
    select: { communityId: true, role: true },
  },
  anonymousIdentities: {
    select: {
      communityId: true,
      displayName: true,
      username: true,
      animalEmoji: true,
      bgColor: true,
    },
  },
  dailyStatuses: {
    where: { date: getTodayUTC() },
    take: 1,
    select: { value: true },
  },
});

// Returns true when an anonymous comment's author should be hidden from this viewer
const shouldMaskAnonComment = (
  authorId: string,
  viewerId: string,
  viewerIsGlobalAdmin: boolean,
  viewerCommunityRole: string | null,
  friendSet: Set<string>,
): boolean => {
  if (authorId === viewerId) return false;
  if (viewerIsGlobalAdmin) return false;
  if (["MODERATOR", "ADMIN", "OWNER"].includes(viewerCommunityRole ?? ""))
    return false;
  if (friendSet.has(authorId)) return false;
  return true;
};

const mapToApiComment = (
  c: CommentWithRelations & {
    author: {
      anonymousIdentities?: Array<{
        communityId: string;
        displayName: string;
        username: string;
        animalEmoji: string;
        bgColor: string;
      }>;
    };
  },
  communityId: string | null,
  viewerId: string,
  viewerIsGlobalAdmin: boolean,
  viewerCommunityRole: string | null,
  friendSet: Set<string>,
) => {
  const communityRole =
    communityId && c.author.communities
      ? (c.author.communities.find((m) => m.communityId === communityId)
          ?.role ?? undefined)
      : undefined;

  const anonIdentity =
    communityId && c.author.anonymousIdentities
      ? c.author.anonymousIdentities.find((a) => a.communityId === communityId)
      : null;

  const masked =
    c.isAnonymous &&
    shouldMaskAnonComment(
      c.authorId,
      viewerId,
      viewerIsGlobalAdmin,
      viewerCommunityRole,
      friendSet,
    );

  const author = masked
    ? {
        id: "anon" as const,
        name: anonIdentity?.displayName || ("Anonymous" as const),
        username: anonIdentity?.username || ("anonymous" as const),
        image: null,
        avatarEmoji: anonIdentity?.animalEmoji || null,
        avatarBgColor: anonIdentity?.bgColor || null,
      }
    : {
        id: c.author.id,
        name: c.author.name,
        username: c.author.username,
        image: c.author.image,
        avatarEmoji: c.author.avatarEmoji,
        avatarBgColor: c.author.avatarBgColor,
        globalRole: c.author.role,
        communityRole,
        dailyStatuses: c.author.dailyStatuses,
        emailVerified: c.author.emailVerified,
      };

  return {
    id: c.id,
    postId: c.postId,
    // Anonymise authorId for masked responses to prevent data leakage
    authorId: masked ? "anon" : c.authorId,
    parentId: c.parentId,
    content: c.content,
    isAnonymous: c.isAnonymous,
    anonymousIdentity: anonIdentity
      ? {
          displayName: anonIdentity.displayName,
          username: anonIdentity.username,
          avatarEmoji: anonIdentity.animalEmoji,
          avatarBgColor: anonIdentity.bgColor,
        }
      : null,
    deletedAt: c.deletedAt?.toISOString() || null,
    editedAt: c.editedAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    author,
    _count: c._count,
    userSupported: c.supportedBy && c.supportedBy.length > 0,
    isHidden: false,
  };
};

// Fetches the viewer context needed for anonymous comment masking
async function getCommentViewerContext(
  userId: string,
  communityId: string | null,
) {
  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      hiddenComments: { select: { commentId: true } },
    },
  });

  let viewerCommunityRole: string | null = null;
  if (communityId) {
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { role: true },
    });
    viewerCommunityRole = membership?.role ?? null;
  }

  const friendships =
    (await prisma.friendship.findMany({
      where: { OR: [{ userId }, { friendId: userId }] },
      select: { userId: true, friendId: true },
    })) || [];
  const friendSet = new Set(
    friendships.map((f) => (f.userId === userId ? f.friendId : f.userId)),
  );

  return {
    viewerIsGlobalAdmin: viewer?.role === "ADMIN",
    viewerCommunityRole,
    friendSet,
    hiddenSet: new Set(viewer?.hiddenComments.map((h) => h.commentId) || []),
  };
}

export async function getPostComments(
  postId: string,
  userId: string,
  sort: "new" | "top" | "old" = "new",
) {
  const getSortConfig = () => {
    if (sort === "top") return { supportedBy: { _count: "desc" as const } };
    if (sort === "old") return { createdAt: "asc" as const };
    return { createdAt: "desc" as const };
  };

  const postRecord = await prisma.post.findUnique({
    where: { id: postId },
    select: { communityId: true },
  });
  const communityId = postRecord?.communityId ?? null;

  const ctx = await getCommentViewerContext(userId, communityId);

  // Fetch top-level comments (parentId is null) and their replies
  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null,
      id: { notIn: Array.from(ctx.hiddenSet) },
    },
    orderBy: getSortConfig(),
    include: {
      author: { select: getCommentAuthorSelect() },

      _count: { select: { supportedBy: true, replies: true } },
      supportedBy: { where: { userId } },
      replies: {
        where: { id: { notIn: Array.from(ctx.hiddenSet) } },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: getCommentAuthorSelect() },

          _count: { select: { supportedBy: true, replies: true } },
          supportedBy: { where: { userId } },
        },
      },
    },
  });

  const buildComment = (c: CommentWithRelations) =>
    mapToApiComment(
      c,
      communityId,
      userId,
      ctx.viewerIsGlobalAdmin,
      ctx.viewerCommunityRole,
      ctx.friendSet,
    );

  return comments.map((c) => ({
    ...buildComment(c),
    replies: c.replies.map(buildComment),
  }));
}

export async function getIsolatedCommentThread(
  commentId: string,
  userId: string,
) {
  // Fetch hidden set upfront before any parent-traversal redirects
  const tempViewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { hiddenComments: { select: { commentId: true } } },
  });
  const hiddenSet = new Set(
    tempViewer?.hiddenComments.map((h) => h.commentId) || [],
  );

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: { select: getCommentAuthorSelect() },

      _count: { select: { supportedBy: true, replies: true } },
      supportedBy: { where: { userId } },
      replies: {
        where: { id: { notIn: Array.from(hiddenSet) } },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: getCommentAuthorSelect() },

          _count: { select: { supportedBy: true, replies: true } },
          supportedBy: { where: { userId } },
        },
      },
    },
  });

  if (!comment) throw new Error("Comment not found");

  // If this is already a reply, fetch its parent thread instead
  if (comment.parentId) {
    return getIsolatedCommentThread(comment.parentId, userId);
  }

  const postRecord = await prisma.post.findUnique({
    where: { id: comment.postId },
    select: { communityId: true },
  });
  const communityId = postRecord?.communityId ?? null;

  const ctx = await getCommentViewerContext(userId, communityId);

  const buildComment = (c: CommentWithRelations) =>
    mapToApiComment(
      c,
      communityId,
      userId,
      ctx.viewerIsGlobalAdmin,
      ctx.viewerCommunityRole,
      ctx.friendSet,
    );

  return {
    ...buildComment(comment),
    replies: comment.replies.map(buildComment),
  };
}

export async function createComment(
  userId: string,
  postId: string,
  data: CreateCommentDTO,
) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  // Mirror the post rule: anonymous commenting only allowed in communities
  if (data.isAnonymous && !post.communityId) {
    throw new Error("Cannot comment anonymously on profile posts");
  }

  let actualParentId = data.parentId || null;

  // Enforce max 1 level of nesting
  if (actualParentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: actualParentId },
      select: { parentId: true },
    });
    if (!parentComment) throw new Error("Parent comment not found");

    // If the parent already has a parent, attach this reply to the root parent
    if (parentComment.parentId) {
      actualParentId = parentComment.parentId;
    }
  }

  return prisma.comment.create({
    data: {
      content: data.content,
      authorId: userId,
      postId,
      parentId: actualParentId,
      isAnonymous: data.isAnonymous ?? false,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          emailVerified: true,
        },
      },
      _count: { select: { supportedBy: true, replies: true } },
      supportedBy: false,
    },
  });
}

export async function updateComment(
  userId: string,
  commentId: string,
  data: UpdateCommentDTO,
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) throw new Error("Comment not found");
  // Only the original author may edit their own comment
  if (comment.authorId !== userId) throw new Error("Unauthorized");
  // Soft-deleted comments cannot be edited
  if (comment.deletedAt) throw new Error("Cannot edit a deleted comment");

  return prisma.comment.update({
    where: { id: commentId },
    data: {
      content: data.content,
      editedAt: new Date(),
    },
  });
}

export async function softDeleteComment(
  userId: string,
  commentId: string,
  moderationReason?: string,
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      post: {
        select: {
          title: true,
          communityId: true,
          community: { select: { name: true } },
        },
      },
    },
  });

  if (!comment) throw new Error("Comment not found");

  let isAuthorized = comment.authorId === userId;
  let deletedByModerator = false;

  // If not author, check if they are a Mod/Admin/Owner of the community or Global Admin
  if (!isAuthorized) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "ADMIN") {
      isAuthorized = true;
      deletedByModerator = true;
    } else if (comment.post?.communityId) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId, communityId: comment.post.communityId },
        },
      });
      if (
        membership &&
        ["MODERATOR", "ADMIN", "OWNER"].includes(membership.role)
      ) {
        isAuthorized = true;
        deletedByModerator = true;
      }
    }
  }

  if (!isAuthorized) throw new Error("Unauthorized");

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  if (deletedByModerator) {
    const communityName = comment.post?.community?.name;
    const postTitle = comment.post?.title;
    const normalizedReason = moderationReason?.trim();

    let title: string;
    let message: string;

    if (communityName && postTitle) {
      title = toI18nPayload("topNavbar.moderation_title", {
        community: communityName,
      });
      message = normalizedReason
        ? toI18nPayload("topNavbar.moderation_comment_deleted_with_reason", {
            post: postTitle,
            community: communityName,
            reason: normalizedReason,
            postId: comment.postId,
          })
        : toI18nPayload("topNavbar.moderation_comment_deleted", {
            post: postTitle,
            community: communityName,
            postId: comment.postId,
          });
    } else {
      title = toI18nPayload("topNavbar.admin_moderation_title", {});
      message = normalizedReason
        ? toI18nPayload("topNavbar.admin_comment_deleted_with_reason", {
            reason: normalizedReason,
          })
        : toI18nPayload("topNavbar.admin_comment_deleted", {});
    }

    await prisma.notification.create({
      data: { userId: comment.authorId, type: "SYSTEM", title, message },
    });
  }

  return updated;
}

export async function handleCommentAction(
  userId: string,
  commentId: string,
  action: "support" | "hide",
) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Comment not found");

  if (action === "support") {
    const existing = await prisma.commentSupport.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (existing) {
      await prisma.commentSupport.delete({
        where: { userId_commentId: { userId, commentId } },
      });
      return { status: "unsupported" };
    } else {
      await prisma.commentSupport.create({ data: { userId, commentId } });
      return { status: "supported" };
    }
  }

  if (action === "hide") {
    const existing = await prisma.hiddenComment.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (existing) {
      await prisma.hiddenComment.delete({
        where: { userId_commentId: { userId, commentId } },
      });
      return { status: "unhidden" };
    } else {
      await prisma.hiddenComment.create({ data: { userId, commentId } });
      return { status: "hidden" };
    }
  }

  throw new Error("Invalid action");
}
