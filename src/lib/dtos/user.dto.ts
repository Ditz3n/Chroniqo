// src/lib/dtos/user.dto.ts
import { z } from "zod";

export const updateQuickReactionsSchema = z.object({
  emojis: z
    .array(
      z
        .string()
        .min(1, "Emoji cannot be empty")
        .max(20, "Invalid emoji length"),
    )
    .length(6, "Exactly 6 emojis are required"),
});

export type UpdateQuickReactionsDTO = z.infer<
  typeof updateQuickReactionsSchema
>;

export const updateSettingsSchema = z.object({
  isPrivate: z.boolean().default(false),
  messagingPermission: z.enum(["ALL", "ONLY_FRIENDS", "NONE"]).default("ALL"),
});

export type UpdateSettingsDTO = z.infer<typeof updateSettingsSchema>;

export const updateHealthSettingsSchema = z.object({
  gender: z.string().nullable().optional(),
  age: z.number().int().min(13).max(99).optional(),
  height: z.union([z.number().positive(), z.null()]).optional(),
  heightUnit: z.enum(["cm", "ft"]).nullable().optional(),
  weight: z.union([z.number().positive(), z.null()]).optional(),
  weightUnit: z.enum(["kg", "lbs"]).nullable().optional(),
  conditions: z.array(z.string().min(1).max(100)).optional(),
  medications: z.array(z.string().min(1).max(100)).optional(),
  birthDate: z.string().nullable().optional(),
  autoUpdateAge: z.boolean().optional(),
  showConditions: z.boolean().optional(),
  showMedications: z.boolean().optional(),
  showAge: z.boolean().optional(),
  showHeight: z.boolean().optional(),
  showWeight: z.boolean().optional(),
});

export type UpdateHealthSettingsDTO = z.infer<
  typeof updateHealthSettingsSchema
>;

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Only lowercase letters, numbers, underscores and hyphens are allowed",
    ),
});

export type UpdateUsernameDTO = z.infer<typeof updateUsernameSchema>;
