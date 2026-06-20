// src/lib/dtos/auth.dto.ts
import { z } from "zod";

// Reusable username validation schema
const usernameValidation = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores",
  );

// DTO for initial registration (US1.1)
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterDTO = z.infer<typeof registerSchema>;

// DTOs for Google signup/login (US1.3)
export const completeGoogleSignupSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type CompleteGoogleSignupDTO = z.infer<
  typeof completeGoogleSignupSchema
>;

// DTO for login (US1.2)
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginDTO = z.infer<typeof loginSchema>;

// DTO for completing the profile (US1.13, US1.14, US1.15, and US1.16)
export const onboardSchema = z.object({
  firstName: z.string().optional().or(z.literal("")),
  lastName: z.string().optional().or(z.literal("")),
  username: usernameValidation.optional(),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  age: z.number().min(0).max(120).optional(),
  weight: z.number().min(0).optional(),
  weightUnit: z.enum(["kg", "lbs"]).optional().or(z.literal("")),
  height: z.number().min(0).optional(),
  heightUnit: z.enum(["cm", "ft"]).optional().or(z.literal("")),
  medications: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),

  // Mood registration (Steps 9 & 10)
  moodValue: z.number().min(0).max(4).optional(),
  moodNote: z
    .string()
    .max(250, "Note cannot exceed 250 characters")
    .optional()
    .or(z.literal("")),
  onboardingStep: z.number().min(1).max(11).optional(),
});

export type OnboardDTO = z.infer<typeof onboardSchema>;

// DTO for forgot password (US1.4)
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  locale: z.enum(["da", "en"]).default("da"),
});
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;

// DTO for reset password (US1.4)
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
