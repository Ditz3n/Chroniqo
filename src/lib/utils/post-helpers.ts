import { PostMetadata } from "@/types/app-types";

export const toPostMetadata = (value: unknown): PostMetadata => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) } as PostMetadata;
};
