// src/services/feed.service.ts
import { prisma } from "@/lib/prisma";
import { FeedPost, PostMetadata, SortOption } from "@/types/app-types";
import { CommunityRole, Prisma } from "@prisma/client";

const feedPostInclude = Prisma.validator<Prisma.PostInclude>()({
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
      // Only fetch elevated memberships - USER role never renders a badge
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
    },
  },
  _count: { select: { comments: true, supportedBy: true } },
  supportedBy: { select: { userId: true, postId: true } },
});

const getFeedPostInclude = (userId: string) =>
  ({
    ...feedPostInclude,
    supportedBy: {
      where: { userId },
      select: { userId: true, postId: true },
    },
  }) satisfies Prisma.PostInclude;

// PrismaFeedPost now derives its shape from the actual include used in queries
type PrismaFeedPost = Prisma.PostGetPayload<{
  include: ReturnType<typeof getFeedPostInclude>;
}>;

const mapPrismaPostToFeedPost = (post: PrismaFeedPost): FeedPost => {
  // Resolve the author's role in this specific community only.
  // Profile posts (communityId = null) never carry a community role badge.
  const communityRole = post.communityId
    ? post.author.communities.find((c) => c.communityId === post.communityId)
        ?.role
    : undefined;

  const anonIdentity = post.communityId
    ? post.author.anonymousIdentities.find(
        (a) => a.communityId === post.communityId,
      )
    : null;

  return {
    id: post.id,
    authorId: post.authorId,
    communityId: post.communityId,
    isAnonymous: post.isAnonymous,
    type: post.type,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    metadata: post.metadata,
    author: {
      id: post.author.id,
      name: post.author.name,
      username: post.author.username,
      image: post.author.image,
      avatarEmoji: post.author.avatarEmoji,
      avatarBgColor: post.author.avatarBgColor,
      globalRole: post.author.role,
      communityRole: communityRole ?? undefined,
      emailVerified: post.author.emailVerified,
    },
    community: post.community
      ? {
          id: post.community.id,
          name: post.community.name,
          image: post.community.image,
          avatarEmoji: post.community.avatarEmoji,
          avatarBgColor: post.community.avatarBgColor,
        }
      : null,
    anonymousIdentity: anonIdentity
      ? {
          displayName: anonIdentity.displayName,
          username: anonIdentity.username,
          animalEmoji: anonIdentity.animalEmoji,
          bgColor: anonIdentity.bgColor,
        }
      : null,
    _count: {
      comments: post._count.comments,
      supportedBy: post._count.supportedBy,
    },
    supportedBy: post.supportedBy.map((s) => ({
      userId: s.userId,
      postId: s.postId,
    })),
    viewCount: post.viewCount,
  };
};

// Takes viewerId to ensure authors always see their own name
const maskPostAuthorIfNeeded = (
  post: FeedPost,
  userRoleInCommunity: string | null,
  viewerId: string,
  friendSet: Set<string>,
  viewerIsGlobalAdmin: boolean = false,
) => {
  if (
    post.isAnonymous &&
    post.authorId !== viewerId && // DO NOT mask if the viewer is the author
    !friendSet.has(post.authorId) &&
    userRoleInCommunity !== "ADMIN" &&
    userRoleInCommunity !== "MODERATOR" &&
    userRoleInCommunity !== "OWNER" &&
    !viewerIsGlobalAdmin
  ) {
    return {
      ...post,
      // Role badges are intentionally stripped for anonymous posts.
      // Use the community identity generated on join, or fallback if absent.
      author: {
        id: "anon",
        name: post.anonymousIdentity?.displayName || "Anonymous",
        username: post.anonymousIdentity?.username || "anonymous",
        image: null,
        avatarEmoji: post.anonymousIdentity?.animalEmoji || null,
        avatarBgColor: post.anonymousIdentity?.bgColor || null,
        emailVerified: null,
      },
    };
  }
  return post;
};

// Helper to fetch user context for rendering state indicators
async function getViewerContext(viewerId: string) {
  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: {
      role: true,
      pinnedPostId: true,
      hiddenPosts: { select: { postId: true } },
      savedPosts: { select: { postId: true } },
    },
  });

  const friendships =
    (await prisma.friendship.findMany({
      where: {
        OR: [{ userId: viewerId }, { friendId: viewerId }],
      },
      select: {
        userId: true,
        friendId: true,
      },
    })) || [];

  const friendSet = new Set(
    friendships.map((f) => (f.userId === viewerId ? f.friendId : f.userId)),
  );

  return {
    role: viewer?.role,
    pinnedPostId: viewer?.pinnedPostId,
    hiddenSet: new Set(viewer?.hiddenPosts.map((h) => h.postId) || []),
    savedSet: new Set(viewer?.savedPosts.map((s) => s.postId) || []),
    friendSet,
  };
}

// Scrubs the voters object from poll metadata to preserve privacy,
// while injecting the user's specific vote
export function scrubMetadata(
  postType: string,
  metadata: Prisma.JsonValue,
  viewerId: string,
) {
  const isJsonObject =
    !!metadata && typeof metadata === "object" && !Array.isArray(metadata);

  if (postType !== "poll" || !isJsonObject) return metadata;

  const safeMeta: PostMetadata = {
    ...(metadata as Record<string, unknown>),
  };
  safeMeta.userVote = safeMeta.voters?.[viewerId] || null;
  delete safeMeta.voters;
  return safeMeta;
}

export async function getCommunityPosts(
  communityName: string,
  userId: string,
  sort: SortOption,
  page: number,
  limit: number = 10,
  userRoleAuth: string = "USER",
) {
  const decodedName = decodeURIComponent(communityName);

  const community = await prisma.community.findUnique({
    where: { name: decodedName },
    include: { members: { where: { userId } } },
  });

  if (!community) throw new Error("Community not found");

  const userRole = community.members[0]?.role || null;
  const isMember = community.members[0]?.status === "ACCEPTED";
  const isGlobalAdmin = userRoleAuth === "ADMIN";

  // Admins bypass the private community lock
  if (community.isPrivate && !isMember && !isGlobalAdmin)
    throw new Error("Access denied");

  const ctx = await getViewerContext(userId);

  const posts = await prisma.post.findMany({
    where: {
      communityId: community.id,
      id: { notIn: Array.from(ctx.hiddenSet) },
    },
    orderBy: getSortOrder(sort),
    skip: (page - 1) * limit,
    take: limit,
    include: getFeedPostInclude(userId),
  });

  return posts.map((rawPost) => {
    const p = mapPrismaPostToFeedPost(rawPost);
    return {
      ...maskPostAuthorIfNeeded(
        p,
        userRole,
        userId,
        ctx.friendSet,
        ctx.role === "ADMIN",
      ),
      metadata: scrubMetadata(p.type, p.metadata, userId),
      isSaved: ctx.savedSet.has(p.id),
      isHidden: false,
      isPinned: p.id === ctx.pinnedPostId,
      supports: p._count.supportedBy,
      userSupported: p.supportedBy.length > 0,
      viewerCommunityRole: userRole ?? null,
    };
  });
}

export async function getUserFeed(
  userId: string,
  sort: SortOption,
  page: number,
  limit: number = 10,
) {
  // 1. Get communities user has joined (excluding suspended communities)
  const memberships = await prisma.communityMember.findMany({
    where: {
      userId,
      status: "ACCEPTED",
      community: { isActive: true },
    },
  });
  const joinedIds = memberships.map((m) => m.communityId);

  // 2. Get hidden communities and filter them out
  const hiddenComms = await prisma.hiddenCommunity.findMany({
    where: { userId },
  });
  const hiddenCommIds = new Set(hiddenComms.map((h) => h.communityId));
  const visibleCommunityIds = joinedIds.filter((id) => !hiddenCommIds.has(id));

  // 3. Fetch posts from visible communities + user's own posts, excluding hidden posts
  const ctx = await getViewerContext(userId);

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { communityId: { in: visibleCommunityIds } },
        { authorId: userId, communityId: null },
      ],
      id: { notIn: Array.from(ctx.hiddenSet) },
    },
    orderBy: getSortOrder(sort),
    skip: (page - 1) * limit,
    take: limit,
    include: getFeedPostInclude(userId),
  });

  // Map roles for efficient masking checking across a mixed feed
  const rolesMap = new Map(memberships.map((m) => [m.communityId, m.role]));

  return posts.map((rawPost) => {
    const p = mapPrismaPostToFeedPost(rawPost);
    const role = p.communityId ? rolesMap.get(p.communityId) || null : null;
    return {
      ...maskPostAuthorIfNeeded(
        p,
        role,
        userId,
        ctx.friendSet,
        ctx.role === "ADMIN",
      ),
      metadata: scrubMetadata(p.type, p.metadata, userId),
      isSaved: ctx.savedSet.has(p.id),
      isHidden: false,
      isPinned: p.id === ctx.pinnedPostId,
      supports: p._count.supportedBy,
      userSupported: p.supportedBy.length > 0,
      viewerCommunityRole: role ?? null,
      isAuthor: p.authorId === userId,
    };
  });
}

export async function getProfilePosts(
  targetUsername: string,
  viewerId: string,
  tab: string,
  sort: SortOption,
  page: number,
  limit: number = 10,
) {
  const targetUser = await prisma.user.findUnique({
    where: { username: targetUsername },
  });
  if (!targetUser) throw new Error("User not found");

  if ((tab === "saved" || tab === "hidden") && targetUser.id !== viewerId) {
    throw new Error("Access denied");
  }

  const ctx = await getViewerContext(viewerId);
  let posts: FeedPost[] = [];

  // Used to map roles quickly
  const memberships = await prisma.communityMember.findMany({
    where: { userId: viewerId, status: "ACCEPTED" },
  });
  const rolesMap = new Map(memberships.map((m) => [m.communityId, m.role]));

  if (tab === "saved") {
    const saved = await prisma.savedPost.findMany({
      where: {
        userId: viewerId,
        post: {
          OR: [{ communityId: null }, { community: { isActive: true } }],
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        post: {
          include: getFeedPostInclude(viewerId),
        },
      },
    });
    posts = saved.map((s) => mapPrismaPostToFeedPost(s.post));
  } else if (tab === "hidden") {
    const hidden = await prisma.hiddenPost.findMany({
      where: {
        userId: viewerId,
        post: {
          OR: [{ communityId: null }, { community: { isActive: true } }],
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        post: {
          include: getFeedPostInclude(viewerId),
        },
      },
    });
    posts = hidden.map((h) => mapPrismaPostToFeedPost(h.post));
  } else {
    // "overview" or "posts"
    const whereClause: Prisma.PostWhereInput = {
      authorId: targetUser.id,
      OR: [{ communityId: null }, { community: { isActive: true } }],
    };

    // Hide anonymous posts and explicitly hidden posts if viewing someone else's profile
    if (targetUser.id !== viewerId) {
      whereClause.isAnonymous = false;
      if (ctx.hiddenSet.size > 0) {
        whereClause.id = { notIn: Array.from(ctx.hiddenSet) };
      }
    }

    const profilePosts = await prisma.post.findMany({
      where: whereClause,
      orderBy: getSortOrder(sort),
      skip: (page - 1) * limit,
      take: limit,
      include: getFeedPostInclude(viewerId),
    });
    posts = profilePosts.map(mapPrismaPostToFeedPost);

    // Inject pinned post at the top of page 1
    if (page === 1 && targetUser.pinnedPostId) {
      const pinnedPost = await prisma.post.findUnique({
        where: { id: targetUser.pinnedPostId },
        include: getFeedPostInclude(viewerId),
      });
      if (
        pinnedPost &&
        (!whereClause.id || !ctx.hiddenSet.has(pinnedPost.id))
      ) {
        posts = posts.filter((p) => p.id !== targetUser.pinnedPostId);
        posts.unshift(mapPrismaPostToFeedPost(pinnedPost));
      }
    }
  }

  return posts.map((p) => {
    const role = p.communityId ? rolesMap.get(p.communityId) || null : null;
    return {
      ...maskPostAuthorIfNeeded(
        p,
        role,
        viewerId,
        ctx.friendSet,
        ctx.role === "ADMIN",
      ),
      metadata: scrubMetadata(p.type, p.metadata, viewerId),
      isSaved: ctx.savedSet.has(p.id),
      isHidden: ctx.hiddenSet.has(p.id),
      isPinned: p.id === targetUser.pinnedPostId,
      supports: p._count.supportedBy,
      userSupported: p.supportedBy.length > 0,
      viewerCommunityRole: role ?? null,
      isAuthor: p.authorId === viewerId,
    };
  });
}

// Resolves frontend sort options to Prisma orderBy conditions
const getSortOrder = (sort: SortOption) => {
  switch (sort) {
    case "new":
      return { createdAt: "desc" as const };
    case "top":
    case "best":
      return [
        { supportedBy: { _count: "desc" as const } },
        { comments: { _count: "desc" as const } },
      ];
    case "hot":
    case "rising":
      return [
        { supportedBy: { _count: "desc" as const } },
        { comments: { _count: "desc" as const } },
        { createdAt: "desc" as const },
      ];
    default:
      return { createdAt: "desc" as const };
  }
};
