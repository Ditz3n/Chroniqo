// src/lib/dtos/community.dto.ts
import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Name can only contain letters, numbers, dashes, and underscores",
    ),
  description: z
    .string()
    .max(250, "Description cannot exceed 250 characters")
    .optional()
    .or(z.literal("")),
  category: z.enum(["chronic", "physical", "psychological"]),
  isPrivate: z.boolean().default(false),
});

export type CreateCommunityDTO = z.infer<typeof createCommunitySchema>;

export const updateCommunitySchema = z.object({
  description: z
    .string()
    .max(250, "Description cannot exceed 250 characters")
    .optional()
    .or(z.literal("")),
  category: z.enum(["chronic", "physical", "psychological"]).optional(),
  isPrivate: z.boolean().optional(),
  isActive: z.boolean().optional(),
  rules: z.array(z.string().max(200)).max(10).optional(),
  image: z.string().optional().nullable(),
  headerImage: z.string().optional().nullable(),
  avatarEmoji: z.string().nullable().optional(),
  avatarBgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  headerEmoji: z.string().nullable().optional(),
  headerBgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export type UpdateCommunityDTO = z.infer<typeof updateCommunitySchema>;
