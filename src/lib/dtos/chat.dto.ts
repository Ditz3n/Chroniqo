// src/lib/dtos/chat.dto.ts
import { z } from "zod";

export const createConversationSchema = z.object({
  // Require at least one other participant
  participantIds: z.array(z.string()).min(1, "Must select at least one user"),
  // Allow users to choose chat duration (e.g., 6, 12, 24, 48, 72 hours)
  durationHours: z.number().min(1).max(72).default(24),
});

export type CreateConversationDTO = z.infer<typeof createConversationSchema>;

export const createMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message too long (max 1000 characters)"),
  replyToId: z.string().optional(),
  dailyStatusId: z.string().optional(),
  // Only honoured in community chats; ignored for direct/group chats
  isAnonymous: z.boolean().optional().default(false),
});

export type CreateMessageDTO = z.infer<typeof createMessageSchema>;

export const reactionSchema = z.object({
  // Max length is set to 20 to accommodate complex emojis with skin tone/gender modifiers
  emoji: z.string().min(1, "Emoji is required").max(20, "Invalid emoji length"),
});

export type ReactionDTO = z.infer<typeof reactionSchema>;

export const updateConversationSchema = z.object({
  name: z
    .string()
    .max(50, "Name cannot exceed 50 characters")
    .optional()
    .nullable(),
  image: z.string().optional().nullable(),
  avatarEmoji: z.string().nullable().optional(),
  avatarBgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export type UpdateConversationDTO = z.infer<typeof updateConversationSchema>;

export const updateParticipantSchema = z.object({
  nickname: z
    .string()
    .max(30, "Nickname cannot exceed 30 characters")
    .optional()
    .nullable(),
});

export type UpdateParticipantDTO = z.infer<typeof updateParticipantSchema>;

export const extendConversationSchema = z.object({
  durationHours: z.union([z.literal(24), z.literal(48), z.literal(72)]),
});

export type ExtendConversationDTO = z.infer<typeof extendConversationSchema>;
