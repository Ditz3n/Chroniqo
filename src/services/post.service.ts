// src/services/post.service.ts
import {
  POLL_OPTIONS_MAX,
  POLL_OPTIONS_MIN,
  POLL_OPTION_TEXT_MAX,
} from "@/lib/constants";
import { CreatePostDTO, SaveDraftDTO } from "@/lib/dtos/post.dto";
import { prisma } from "@/lib/prisma";
import { toPostMetadata } from "@/lib/utils/post-helpers";
import { PollOption, PostMetadata } from "@/types/app-types";
import { CommunityRole, Prisma } from "@prisma/client";

const toI18nPayload = (key: string, params: Record<string, string>) =>
  JSON.stringify({ key, params });

export async function createPost(userId: string, data: CreatePostDTO) {
  // If posting as anonymous, verify it's to a community, not a personal profile
  if (data.isAnonymous && !data.communityId) {
    throw new Error("Cannot post anonymously to your personal profile");
  }

  // Verify community exists and user is a member if communityId is provided
  if (data.communityId) {
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: data.communityId } },
    });

    const isMember = membership?.status === "ACCEPTED";
    const community = await prisma.community.findUnique({
      where: { id: data.communityId },
    });

    // Only restrict posting if the community is PRIVATE and the user is NOT a member
    if (community?.isPrivate && !isMember) {
      throw new Error(
        "You must be an accepted member of this private community to post",
      );
    }
  }

  const finalMetadata: PostMetadata = toPostMetadata(data.metadata);

  // Initialize Poll-specific metadata safely
  if (data.type === "poll") {
    finalMetadata.voters = {};
    finalMetadata.totalVotes = 0;

    // Set expiration based on durationHours, defaulting to 24
    const hours =
      typeof finalMetadata.durationHours === "number"
        ? finalMetadata.durationHours
        : 24;
    finalMetadata.closesAt = new Date(
      Date.now() + hours * 60 * 60 * 1000,
    ).toISOString();

    // Reset votes to 0 to prevent client manipulation
    const rawOptions = Array.isArray(finalMetadata.options)
      ? (finalMetadata.options as PollOption[])
      : [];

    const normalizedOptions = rawOptions
      .map((o) => ({
        ...o,
        text: String(o.text ?? "").trim(),
      }))
      .filter((o) => o.text.length > 0);

    if (normalizedOptions.length < POLL_OPTIONS_MIN) {
      throw new Error("A poll must have at least 2 options");
    }

    if (normalizedOptions.length > POLL_OPTIONS_MAX) {
      throw new Error(`A poll can have at most ${POLL_OPTIONS_MAX} options`);
    }

    if (normalizedOptions.some((o) => o.text.length > POLL_OPTION_TEXT_MAX)) {
      throw new Error(
        `Poll options cannot exceed ${POLL_OPTION_TEXT_MAX} characters`,
      );
    }

    finalMetadata.options = normalizedOptions.map((o) => ({
      ...o,
      votes: 0,
    }));
  }

  return prisma.post.create({
    data: {
      authorId: userId,
      communityId: data.communityId || null,
      title: data.title,
      type: data.type,
      content: data.content || null,
      metadata: finalMetadata as Prisma.InputJsonValue,
      isAnonymous: data.isAnonymous,
    },
  });
}

export async function getUserDrafts(userId: string) {
  return prisma.postDraft.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      community: {
        select: { id: true, name: true, image: true },
      },
    },
  });
}

export async function saveDraft(userId: string, data: SaveDraftDTO) {
  if (data.id) {
    // Verify ownership before updating
    const existing = await prisma.postDraft.findUnique({
      where: { id: data.id },
    });

    if (!existing) throw new Error("Draft not found");
    if (existing.authorId !== userId) throw new Error("Unauthorized");

    return prisma.postDraft.update({
      where: { id: data.id },
      data: {
        title: data.title || null,
        type: data.type,
        communityId: data.communityId || null,
        content: data.content || null,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  // Create new draft
  return prisma.postDraft.create({
    data: {
      authorId: userId,
      title: data.title || null,
      type: data.type,
      communityId: data.communityId || null,
      content: data.content || null,
      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

export async function deleteDraft(userId: string, draftId: string) {
  const existing = await prisma.postDraft.findUnique({
    where: { id: draftId },
  });

  if (!existing) throw new Error("Draft not found");
  if (existing.authorId !== userId) throw new Error("Unauthorized");

  await prisma.postDraft.delete({
    where: { id: draftId },
  });

  return { success: true };
}

export async function deletePost(
  userId: string,
  postId: string,
  moderationReason?: string,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      authorId: true,
      communityId: true,
      community: {
        select: {
          name: true,
        },
      },
    },
  });
  if (!post) throw new Error("Post not found");

  let deletedByModerator = false;

  if (post.authorId !== userId) {
    // Global admin can delete any post regardless of community membership
    const callerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (callerUser?.role === "ADMIN") {
      deletedByModerator = true;
    } else {
      if (!post.communityId) throw new Error("Unauthorized");

      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: post.communityId,
          },
        },
      });

      const hasModerationRole =
        membership?.role === "MODERATOR" ||
        membership?.role === "ADMIN" ||
        membership?.role === "OWNER";

      if (
        !membership ||
        membership.status !== "ACCEPTED" ||
        !hasModerationRole
      ) {
        throw new Error("Unauthorized");
      }

      deletedByModerator = true;
    }
  }

  await prisma.post.delete({ where: { id: postId } });

  if (deletedByModerator) {
    const communityName = post.community?.name;
    const normalizedReason = moderationReason?.trim();

    let title: string;
    let message: string;

    if (communityName) {
      // Community moderator or admin deleting a community post
      title = toI18nPayload("topNavbar.moderation_title", {
        community: communityName,
      });
      message = normalizedReason
        ? toI18nPayload("topNavbar.moderation_message_deleted_with_reason", {
            post: post.title,
            community: communityName,
            reason: normalizedReason,
          })
        : toI18nPayload("topNavbar.moderation_message_deleted", {
            post: post.title,
            community: communityName,
          });
    } else {
      // Global admin deleting a profile post (no community context)
      title = toI18nPayload("topNavbar.admin_moderation_title", {});
      message = normalizedReason
        ? toI18nPayload("topNavbar.admin_message_deleted_with_reason", {
            post: post.title,
            reason: normalizedReason,
          })
        : toI18nPayload("topNavbar.admin_message_deleted", {
            post: post.title,
          });
    }

    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "SYSTEM",
        title,
        message,
      },
    });
  }

  return { success: true };
}

export async function handlePostAction(
  userId: string,
  postId: string,
  action: "save" | "hide" | "pin" | "spoiler" | "support",
) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  if (action === "support") {
    const existing = await prisma.postSupport.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await prisma.postSupport.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { status: "unsupported" };
    } else {
      await prisma.postSupport.create({ data: { userId, postId } });
      return { status: "supported" };
    }
  }

  if (action === "save") {
    const existing = await prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await prisma.savedPost.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { status: "unsaved" };
    } else {
      await prisma.savedPost.create({ data: { userId, postId } });
      return { status: "saved" };
    }
  }

  if (action === "hide") {
    const existing = await prisma.hiddenPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await prisma.hiddenPost.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { status: "unhidden" };
    } else {
      await prisma.hiddenPost.create({ data: { userId, postId } });
      return { status: "hidden" };
    }
  }

  // Actions requiring authorship
  if (post.authorId !== userId) throw new Error("Unauthorized");

  if (action === "pin") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.pinnedPostId === postId) {
      await prisma.user.update({
        where: { id: userId },
        data: { pinnedPostId: null },
      });
      return { status: "unpinned" };
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { pinnedPostId: postId },
      });
      return { status: "pinned" };
    }
  }

  if (action === "spoiler") {
    const currentMeta = (post.metadata as Record<string, unknown>) || {};
    const newSpoiler = !currentMeta.spoiler;
    await prisma.post.update({
      where: { id: postId },
      data: { metadata: { ...currentMeta, spoiler: newSpoiler } },
    });
    return { status: newSpoiler ? "spoiler_added" : "spoiler_removed" };
  }

  throw new Error("Invalid action");
}

export async function getPostById(userId: string, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          role: true,
          emailVerified: true,
          // Only fetch elevated memberships - same strategy as the feed service
          communities: {
            where: {
              role: { in: ["MODERATOR", "ADMIN", "OWNER"] as CommunityRole[] },
            },
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
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          isPrivate: true,
        },
      },
      _count: { select: { comments: true, supportedBy: true } },
      savedBy: { where: { userId } },
      hiddenBy: { where: { userId } },
      supportedBy: { where: { userId } }, // Fetch user's support status
    },
  });

  if (!post) throw new Error("Post not found");

  // Verify access if it's in a private community
  if (post.communityId && post.community?.isPrivate) {
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: post.communityId } },
    });
    if (membership?.status !== "ACCEPTED") {
      throw new Error("Access denied");
    }
  }

  if (post.hiddenBy.length > 0) throw new Error("Post is hidden");

  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, pinnedPostId: true },
  });

  let isMod = false;
  let viewerCommunityRole: CommunityRole | null = null;
  if (post.communityId) {
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: post.communityId } },
    });
    if (
      membership?.role === "MODERATOR" ||
      membership?.role === "ADMIN" ||
      membership?.role === "OWNER"
    ) {
      isMod = true;
      viewerCommunityRole = membership.role;
    }
  }

  const isFriend = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: userId, friendId: post.authorId },
        { userId: post.authorId, friendId: userId },
      ],
    },
  });

  const canSeeAnon =
    post.authorId === userId || viewer?.role === "ADMIN" || isMod || !!isFriend;

  const isAnonymousToViewer = post.isAnonymous && !canSeeAnon;

  // Resolve community role for this specific post's community
  const authorCommunityRole = post.communityId
    ? post.author.communities.find((c) => c.communityId === post.communityId)
        ?.role
    : undefined;

  // Fire and Forget View Count & Recent Post Logging
  // We log the visit for the user (even if it's their own post so it shows in history),
  // but only increment global viewCount if it's not the author.
  const logVisitPromise = prisma.recentPost.upsert({
    where: { userId_postId: { userId, postId } },
    update: { visitedAt: new Date() },
    create: { userId, postId },
  });

  if (post.authorId !== userId) {
    Promise.all([
      prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      }),
      logVisitPromise,
    ]).catch(() => {});
  } else {
    logVisitPromise.catch(() => {});
  }

  let finalAuthor: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    globalRole?: typeof post.author.role | undefined;
    communityRole?: typeof authorCommunityRole | undefined;
    emailVerified?: typeof post.author.emailVerified | undefined;
  };

  // Resolve the anonymous identity for this specific community
  const anonIdentity = post.communityId
    ? post.author.anonymousIdentities.find(
        (a) => a.communityId === post.communityId,
      )
    : null;

  if (isAnonymousToViewer) {
    // Strip identity and roles - anonymous post reveals nothing about the author
    finalAuthor = {
      id: "anon",
      name: anonIdentity?.displayName || "Anonymous",
      username: anonIdentity?.username || "anonymous",
      image: null,
      avatarEmoji: anonIdentity?.animalEmoji || null,
      avatarBgColor: anonIdentity?.bgColor || null,
    };
  } else {
    finalAuthor = {
      id: post.author.id,
      name: post.author.name,
      username: post.author.username,
      image: post.author.image,
      avatarEmoji: post.author.avatarEmoji,
      avatarBgColor: post.author.avatarBgColor,
      globalRole: post.author.role,
      communityRole: authorCommunityRole ?? undefined,
      emailVerified: post.author.emailVerified,
    };
  }

  const safeMetadata: PostMetadata = toPostMetadata(post.metadata);
  if (post.type === "poll") {
    safeMetadata.userVote = safeMetadata.voters?.[userId] || null;
    delete safeMetadata.voters;
  }

  return {
    id: post.id,
    title: post.title,
    type: post.type,
    content: post.content,
    metadata: safeMetadata,
    isAnonymous: post.isAnonymous,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: finalAuthor,
    anonymousIdentity: anonIdentity
      ? {
          displayName: anonIdentity.displayName,
          username: anonIdentity.username,
          animalEmoji: anonIdentity.animalEmoji,
          bgColor: anonIdentity.bgColor,
        }
      : null,
    community: post.community,
    _count: post._count,
    supports: post._count.supportedBy,
    userSupported: post.supportedBy.length > 0,
    isSaved: post.savedBy.length > 0,
    isHidden: false,
    isPinned: viewer?.pinnedPostId === post.id,
    viewerCommunityRole,
    viewCount: post.viewCount,
    isAuthor: post.authorId === userId,
  };
}
