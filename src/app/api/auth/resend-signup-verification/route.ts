// src/app/api/auth/resend-signup-verification/route.ts
import { auth } from "@/auth";
import { sendSignupVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateSignupVerificationToken } from "@/services/auth.service";
import { NextResponse } from "next/server";

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * POST - Generates a fresh signup verification token and resends the email.
 * Enforces a 60-second server-side cooldown to prevent abuse.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      locale: true,
      signupVerified: true,
      signupVerificationToken: {
        select: { createdAt: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Already verified - gate should not be visible, but guard server-side anyway
  if (user.signupVerified) {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  // Server-side cooldown check to prevent email spam
  if (user.signupVerificationToken?.createdAt) {
    const ageMs =
      Date.now() - new Date(user.signupVerificationToken.createdAt).getTime();
    if (ageMs < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - ageMs) / 1000);
      return NextResponse.json(
        { error: "Too soon", retryAfterSeconds },
        { status: 429 },
      );
    }
  }

  const tokenRecord = await generateSignupVerificationToken(
    session.user.id,
    user.email,
  );
  await sendSignupVerificationEmail(
    user.email,
    tokenRecord.token,
    user.locale ?? "da",
  );

  console.log(`[ResendSignupVerification] Resent to ${user.email}`);

  return NextResponse.json({
    success: true,
    tokenCreatedAt: tokenRecord.createdAt,
  });
}
