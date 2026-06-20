// src/lib/dtos/report.dto.ts
import { z } from "zod";

export const submitReportSchema = z.object({
  targetType: z.enum(["USER", "COMMUNITY", "POST", "COMMENT"]),
  targetId: z.string().min(1, "Target ID is required"),
  communityContextId: z.string().min(1).optional(),
  postContextId: z.string().min(1).optional(),
  commentContextId: z.string().min(1).optional(),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(250, "Reason cannot exceed 250 characters"),
  blockUser: z.boolean().optional().default(false),
});

export type SubmitReportDTO = z.infer<typeof submitReportSchema>;
