// src/lib/dtos/daily-status.dto.ts
import { z } from "zod";

export const dailyStatusSchema = z.object({
  value: z.number().min(0).max(4),
  note: z
    .string()
    .max(250, "Note cannot exceed 250 characters")
    .optional()
    .or(z.literal("")),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .optional(),
});

export type DailyStatusDTO = z.infer<typeof dailyStatusSchema>;
