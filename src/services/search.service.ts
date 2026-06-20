// src/services/search.service.ts
import { prisma } from "@/lib/prisma";
import { getTodayUTC } from "@/lib/utils/mood-ring";
import { Prisma } from "@prisma/client";
import { scrubMetadata } from "./feed.service";
import { canViewDailyStatus } from "./user.service";

const searchPostInclude = Prisma.validator<Prisma.PostInclude>()({
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarEmoji: true,
      avatarBgColor: true,
      emailVerified: true,
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

const getSearchPostInclude = (userId: string): Prisma.PostInclude => ({
  ...searchPostInclude,
  supportedBy: {
    where: { userId },
    select: { userId: true, postId: true },
  },
});

type SearchPostRaw = Prisma.PostGetPayload<{
  include: typeof searchPostInclude;
}>;

const mapPost = (post: SearchPostRaw, userId: string) => ({
  id: post.id,
  authorId: post.authorId,
  communityId: post.communityId,
  isAnonymous: post.isAnonymous,
  type: post.type,
  title: post.title,
  content: post.content,
  // Strips voters, injects userVote - mirrors feed.service.ts privacy contract
  metadata: scrubMetadata(post.type, post.metadata, userId),
  createdAt: post.createdAt.toISOString(),
  author: post.author,
  community: post.community,
  anonymousIdentity: post.communityId
    ? (() => {
        const anon = post.author.anonymousIdentities.find(
          (a) => a.communityId === post.communityId,
        );
        return anon
          ? {
              displayName: anon.displayName,
              username: anon.username,
              animalEmoji: anon.animalEmoji,
              bgColor: anon.bgColor,
            }
          : null;
      })()
    : null,
  _count: post._count,
  supports: post._count.supportedBy,
  comments: post._count.comments,
  userSupported: (post.supportedBy as { userId: string }[]).length > 0,
  isSaved: false,
  isHidden: false,
  isPinned: false,
});

export async function searchUsers(query: string, viewerId: string, limit = 5) {
  const users = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      headerImage: true,
      isPrivate: true,
      avatarEmoji: true,
      avatarBgColor: true,
      headerEmoji: true,
      headerBgColor: true,
      emailVerified: true,
      dailyStatuses: {
        where: { date: getTodayUTC() },
        take: 1,
        select: { value: true },
      },
      _count: { select: { friendships: true } },
    },
    take: limit,
  });

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // Batch friendship check - one query instead of N individual lookups
  const friendRecords = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: viewerId, friendId: { in: userIds } },
        { friendId: viewerId, userId: { in: userIds } },
      ],
    },
    select: { userId: true, friendId: true },
  });
  const friendSet = new Set(
    friendRecords.map((f) => (f.userId === viewerId ? f.friendId : f.userId)),
  );

  // Bulk support count - one query instead of N, groups by post.authorId in memory
  const supportRecords = await prisma.postSupport.findMany({
    where: { post: { authorId: { in: userIds } } },
    select: { post: { select: { authorId: true } } },
  });

  const supportsMap = new Map<string, number>();
  for (const { post } of supportRecords) {
    supportsMap.set(post.authorId, (supportsMap.get(post.authorId) ?? 0) + 1);
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    image: u.image,
    headerImage: u.headerImage,
    avatarEmoji: u.avatarEmoji,
    avatarBgColor: u.avatarBgColor,
    headerEmoji: u.headerEmoji,
    emailVerified: u.emailVerified,
    headerBgColor: u.headerBgColor,
    // Enforce US2.15: strip mood ring for private profiles unless the viewer is a friend
    currentMood: canViewDailyStatus(viewerId, u, friendSet)
      ? (u.dailyStatuses[0] ?? null)
      : null,
    stats: {
      friends: u._count.friendships,
      supports: supportsMap.get(u.id) ?? 0,
    },
  }));
}

export async function searchCommunities(query: string, limit = 5) {
  return prisma.community.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      image: true,
      headerImage: true,
      avatarEmoji: true,
      avatarBgColor: true,
      headerEmoji: true,
      headerBgColor: true,
      _count: { select: { members: { where: { status: "ACCEPTED" } } } },
    },
    take: limit,
  });
}

export async function searchPostsGlobal(
  query: string,
  userId: string,
  limit = 10,
) {
  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: getSearchPostInclude(userId),
  });
  return posts.map((p) => mapPost(p as unknown as SearchPostRaw, userId));
}

export async function searchPostsByCommunity(
  query: string,
  communityName: string,
  userId: string,
  limit = 20,
) {
  const community = await prisma.community.findUnique({
    where: { name: decodeURIComponent(communityName) },
  });
  if (!community) return [];

  const posts = await prisma.post.findMany({
    where: {
      communityId: community.id,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: getSearchPostInclude(userId),
  });
  return posts.map((p) => mapPost(p as unknown as SearchPostRaw, userId));
}

export async function searchPostsByUser(
  query: string,
  targetUsername: string,
  viewerId: string,
  limit = 20,
) {
  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) return [];

  const isOwnProfile = target.id === viewerId;

  const posts = await prisma.post.findMany({
    where: {
      authorId: target.id,
      // Don't expose anonymous posts to other viewers
      ...(isOwnProfile ? {} : { isAnonymous: false }),
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: getSearchPostInclude(viewerId),
  });
  return posts.map((p) => mapPost(p as unknown as SearchPostRaw, viewerId));
}
