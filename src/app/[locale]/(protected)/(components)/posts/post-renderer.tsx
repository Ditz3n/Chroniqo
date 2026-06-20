// src/app/[locale]/(protected)/(components)/posts/post-renderer.tsx
import {
  PostRendererProps as BasePostRendererProps,
  Post,
} from "@/types/app-types";
import { ImagePost } from "./image-post";
import { LinkPost } from "./link-post";
import { PollPost } from "./poll-post";
import { TextPost } from "./text-post";
import { VideoPost } from "./video-post";
import { YoutubePost } from "./youtube-post";

type PostRendererProps = BasePostRendererProps & { isPriority?: boolean };

export function PostRenderer({
  post,
  layout,
  hasPinnedPostInFeed,
  onHideDelete,
  currentTab,
  isSingleView = false,
  isPriority = false,
}: PostRendererProps) {
  const sharedProps = {
    post,
    layout,
    hasPinnedPostInFeed,
    onHideDelete,
    currentTab,
    isSingleView,
  };

  switch (post.type) {
    case "text":
      return (
        <TextPost
          key={`${post.id}-${post.spoiler ? "spoiler" : "plain"}`}
          {...sharedProps}
          post={post as Extract<Post, { type: "text" }>}
        />
      );
    case "image":
      return (
        <ImagePost
          key={`${post.id}-${post.spoiler ? "spoiler" : "plain"}`}
          {...sharedProps}
          isPriority={isPriority}
          post={post as Extract<Post, { type: "image" }>}
        />
      );
    case "video":
      return (
        <VideoPost
          key={`${post.id}-${post.spoiler ? "spoiler" : "plain"}`}
          {...sharedProps}
          isPriority={isPriority}
          post={post as Extract<Post, { type: "video" }>}
        />
      );
    case "youtube":
      return (
        <YoutubePost
          {...sharedProps}
          isPriority={isPriority}
          post={post as Extract<Post, { type: "youtube" }>}
        />
      );
    case "link":
      return (
        <LinkPost
          {...sharedProps}
          isPriority={isPriority}
          post={post as Extract<Post, { type: "link" }>}
        />
      );
    case "poll":
      return (
        <PollPost
          {...sharedProps}
          post={post as Extract<Post, { type: "poll" }>}
        />
      );
  }
}
