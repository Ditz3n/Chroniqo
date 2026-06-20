// src/lib/utils/post-mappers.ts
import { ApiPost, Post } from "@/types/app-types";

type TimeAgoFn = (date: Date | string) => string;

type PollOption = {
  id: string;
  text: string;
  votes: number;
};

function getMetadata(apiPost: ApiPost): Record<string, unknown> {
  return (apiPost.metadata || {}) as Record<string, unknown>;
}

export function mapApiPostToUi(
  apiPost: ApiPost,
  timeAgoFn: TimeAgoFn,
  isAuthor = false,
): Post {
  const meta = getMetadata(apiPost);

  const base = {
    id: apiPost.id,
    authorId: apiPost.author.id,
    communityId: apiPost.community?.id ?? null,
    community: apiPost.community ? apiPost.community.name : "Profile",
    communityAvatar: apiPost.community?.image || undefined,
    communityAvatarEmoji: apiPost.community?.avatarEmoji || null,
    communityAvatarBgColor: apiPost.community?.avatarBgColor || null,
    author: apiPost.author.name || apiPost.author.username || "Anonymous",
    authorUsername: apiPost.author.username || "anonymous",
    authorImage: apiPost.author.image || null,
    authorAvatarEmoji: apiPost.author.avatarEmoji || null,
    authorAvatarBgColor: apiPost.author.avatarBgColor || null,
    authorGlobalRole: apiPost.author.globalRole,
    authorEmailVerified: apiPost.author.emailVerified || null,
    authorCommunityRole: apiPost.author.communityRole,
    anonymousIdentity: apiPost.anonymousIdentity
      ? {
          displayName: apiPost.anonymousIdentity.displayName,
          username: apiPost.anonymousIdentity.username,
          avatarEmoji: apiPost.anonymousIdentity.animalEmoji,
          avatarBgColor: apiPost.anonymousIdentity.bgColor,
        }
      : null,
    timeAgo: timeAgoFn(apiPost.createdAt),
    title: apiPost.title,
    body: apiPost.content || undefined,
    supports: apiPost.supports,
    comments: apiPost._count.comments,
    userSupported: apiPost.userSupported,
    spoiler: !!meta.spoiler,
    isSaved: apiPost.isSaved,
    isHidden: apiPost.isHidden,
    isPinned: apiPost.isPinned,
    viewerCommunityRole: apiPost.viewerCommunityRole ?? null,
    isAuthor,
    isAnonymous: apiPost.isAnonymous,
    viewCount: apiPost.viewCount,
  };

  switch (apiPost.type) {
    case "image":
      return {
        ...base,
        type: "image",
        images: Array.isArray(meta.images) ? (meta.images as string[]) : [],
      };
    case "video":
      return {
        ...base,
        type: "video",
        videoUrl: (meta.videoUrl as string) || "",
        thumbnailUrl: (meta.thumbnailUrl as string) || "",
        duration: (meta.duration as number) || 0,
      };
    case "youtube":
      return {
        ...base,
        type: "youtube",
        videoId: (meta.videoId as string) || "",
      };
    case "link":
      return {
        ...base,
        type: "link",
        url: (meta.url as string) || "",
        siteName: (meta.siteName as string) || "",
        metaTitle: (meta.metaTitle as string) || "",
        metaDescription: (meta.metaDescription as string) || "",
        metaImage: (meta.metaImage as string) || "",
      };
    case "poll": {
      const closesAt = (meta.closesAt as string) || new Date().toISOString();
      return {
        ...base,
        type: "poll",
        content: apiPost.content || undefined, // Ensures it is mapped for PollPost types
        options: Array.isArray(meta.options)
          ? (meta.options as PollOption[])
          : [],
        closesAt,
        isClosed: new Date(closesAt).getTime() <= Date.now(),
        userVote: (meta.userVote as string) || null,
        totalVotes: (meta.totalVotes as number) || 0,
      };
    }
    case "text":
    default:
      return { ...base, type: "text", body: apiPost.content || "" };
  }
}
