// src/services/auth.service.ts
import {
  CompleteGoogleSignupDTO,
  OnboardDTO,
  RegisterDTO,
} from "@/lib/dtos/auth.dto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function registerUser(data: RegisterDTO) {
  // 1. Check if the email is globally banned
  const activeBan = await prisma.globalBan.findFirst({
    where: {
      email: data.email,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (activeBan) {
    throw new Error("This email is banned from the platform");
  }

  // 2. Check for duplicate email
  const existingUser = await prisma.user.findFirst({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("Email already exists");
  }

  // Hash password before saving
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      hashedPassword,
    },
    // Prevents hashedPassword from leaking out of the service
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  return user;
}

export async function completeGoogleSignup(
  userId: string,
  data: CompleteGoogleSignupDTO,
) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
    // Prevents hashedPassword from leaking out of the service
    select: {
      id: true,
      email: true,
    },
  });

  return updatedUser;
}

export async function onboardUser(userId: string, data: OnboardDTO) {
  // Update user and mark as onboarded
  console.log(`[AuthService] Onboarding user ${userId}`, data);

  // Check if username is already taken by someone else
  if (data.username) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing && existing.id !== userId)
      throw new Error("Username is already taken");
  }

  // Run in a transaction to ensure both profile and mood are saved successfully together
  const [updatedUser] = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Update the user profile
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          username: data.username || undefined,
          gender: data.gender || null,
          age: data.age || null,
          weight: data.weight || null,
          weightUnit: data.weightUnit || null,
          height: data.height || null,
          heightUnit: data.heightUnit || null,
          medications: data.medications || [],
          conditions: data.conditions || [],
          onboarded: data.onboardingStep === 11,
          onboardingStep: data.onboardingStep || undefined,
          name:
            [data.firstName, data.lastName].filter(Boolean).join(" ") || null,
        },
        // Returns only what is needed to update the session
        select: {
          id: true,
          username: true,
          onboarded: data.onboardingStep === 11 ? true : undefined,
        },
      });

      // 2. If a mood was provided in step 9, create the initial DailyStatus
      if (data.moodValue !== undefined && data.onboardingStep === 11) {
        // Create a clean date representing midnight for today's entry
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.dailyStatus.upsert({
          where: { userId_date: { userId, date: today } },
          update: { value: data.moodValue, note: data.moodNote || null },
          create: {
            userId,
            value: data.moodValue,
            note: data.moodNote || null,
            date: today,
          },
        });
      }

      return [user];
    },
  );

  return updatedUser;
}

export async function deleteUser(userId: string) {
  // All related records are removed automatically via ON DELETE CASCADE in the Prisma schema
  const deletedUser = await prisma.user.delete({
    where: { id: userId },
  });

  return deletedUser;
}

export async function generatePasswordResetToken(
  userId: string,
  email: string,
) {
  // Delete existing token if it exists to prevent spam
  await prisma.passwordResetToken.deleteMany({ where: { email } });
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 3600 * 1000);
  return await prisma.passwordResetToken.create({
    data: { userId, email, token, expires },
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const existingToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });
  if (!existingToken) throw new Error("Invalid token");
  if (new Date(existingToken.expires) < new Date())
    throw new Error("Token has expired");

  const existingUser = await prisma.user.findUnique({
    where: { email: existingToken.email },
  });
  if (!existingUser) throw new Error("User does not exist");

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password and delete the token in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: existingUser.id },
      data: { hashedPassword },
    }),
    prisma.passwordResetToken.delete({ where: { id: existingToken.id } }),
  ]);

  return true;
}

/**
 * Generates a single-use email verification token.
 * Any previously issued token for this email is deleted first to prevent accumulation.
 */
export async function generateEmailVerificationToken(
  userId: string,
  email: string,
) {
  await prisma.emailVerificationToken.deleteMany({ where: { email } });
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 3600 * 1000);
  return await prisma.emailVerificationToken.create({
    data: { userId, email, token, expires },
  });
}

/**
 * Validates an email verification token, marks the user as verified,
 * and deletes the consumed token in a single transaction.
 */
export async function verifyEmailToken(token: string) {
  const existing = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });
  if (!existing) throw new Error("Invalid token");
  if (new Date(existing.expires) < new Date())
    throw new Error("Token has expired");

  await prisma.$transaction([
    prisma.user.update({
      where: { email: existing.email },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.delete({ where: { id: existing.id } }),
  ]);

  return true;
}

/**
 * Generates a single-use username change token storing the desired new username.
 * Any previously issued token for this user is deleted first.
 */
export async function generateUsernameChangeToken(
  userId: string,
  email: string,
) {
  await prisma.usernameChangeToken.deleteMany({ where: { email } });
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 3600 * 1000);
  return await prisma.usernameChangeToken.create({
    data: { userId, email, token, expires },
  });
}

/**
 * Validates a username change token and returns the record.
 * Deletion is the caller's responsibility (handled in the route transaction).
 */
export async function verifyUsernameChangeToken(token: string) {
  const existing = await prisma.usernameChangeToken.findUnique({
    where: { token },
  });
  if (!existing) throw new Error("Invalid token");
  if (new Date(existing.expires) < new Date())
    throw new Error("Token has expired");
  return existing;
}

/**
 * Generates a single-use account deletion token for the given email.
 * Uses the dedicated AccountDeletionToken model - fully isolated from password reset flow.
 * Any previously issued token for this email is deleted first to prevent accumulation.
 */
export async function generateAccountDeletionToken(
  userId: string,
  email: string,
) {
  await prisma.accountDeletionToken.deleteMany({ where: { email } });
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 3600 * 1000);
  return await prisma.accountDeletionToken.create({
    data: { userId, email, token, expires },
  });
}

/**
 * Generates a single-use signup verification token with a 24-hour window.
 * The longer expiry (vs. 1h for other tokens) accounts for email delays and
 * users who sign up and return later in the day.
 * Any previously issued token for this user is replaced atomically.
 */
export async function generateSignupVerificationToken(
  userId: string,
  email: string,
) {
  // Replace any existing token - only one active signup token per user
  await prisma.signupVerificationToken.deleteMany({ where: { userId } });
  const token = crypto.randomUUID();
  // 24 hours: generous enough for real users, short enough to limit stale unverified accounts
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return await prisma.signupVerificationToken.create({
    data: { userId, email, token, expires },
  });
}

/**
 * Validates a signup verification token, marks the user's signup as verified,
 * and deletes the consumed token in a single transaction.
 */
export async function verifySignupToken(token: string) {
  const existing = await prisma.signupVerificationToken.findUnique({
    where: { token },
  });
  if (!existing) throw new Error("Invalid token");
  if (new Date(existing.expires) < new Date())
    throw new Error("Token has expired");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existing.userId },
      data: { signupVerified: new Date() },
    }),
    prisma.signupVerificationToken.delete({ where: { id: existing.id } }),
  ]);

  return true;
}
