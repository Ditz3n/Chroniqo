// src/lib/dtos/comment.dto.ts
import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(3000, "Comment cannot exceed 3000 characters"),
  parentId: z.string().optional().nullable(),
  isAnonymous: z.boolean().default(false),
});

export type CreateCommentDTO = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(3000, "Comment cannot exceed 3000 characters"),
});

export type UpdateCommentDTO = z.infer<typeof updateCommentSchema>;

export const commentActionSchema = z.object({
  action: z.enum(["support", "hide"]),
});
