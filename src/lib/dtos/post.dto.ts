// src/lib/dtos/post.dto.ts
import { z } from "zod";

export const postTypeEnum = z.enum([
  "text",
  "image",
  "video",
  "youtube",
  "link",
  "poll",
]);

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(300, "Title cannot exceed 300 characters"),
  type: postTypeEnum.default("text"),
  communityId: z.string().nullable().optional(), // null = user profile
  content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),

  isAnonymous: z.boolean().default(false),
});

export type CreatePostDTO = z.infer<typeof createPostSchema>;

export const saveDraftSchema = z.object({
  id: z.string().optional(), // Provide ID to update existing draft
  title: z
    .string()
    .max(300, "Title cannot exceed 300 characters")
    .optional()
    .or(z.literal("")),
  type: postTypeEnum.default("text"),
  communityId: z.string().nullable().optional(),
  content: z.string().optional().or(z.literal("")),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type SaveDraftDTO = z.infer<typeof saveDraftSchema>;

export const pollVoteSchema = z.object({
  optionId: z.string().min(1, "Option ID is required"),
});

export type PollVoteDTO = z.infer<typeof pollVoteSchema>;
