// src/lib/dtos/niqo.dto.ts
import { z } from "zod";

export const NiqoMessageDTO = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
});

export const StartNiqoChatDTO = NiqoMessageDTO;
export const SendNiqoMessageDTO = NiqoMessageDTO;

export type StartNiqoChatPayload = z.infer<typeof StartNiqoChatDTO>;
export type SendNiqoMessagePayload = z.infer<typeof SendNiqoMessageDTO>;
