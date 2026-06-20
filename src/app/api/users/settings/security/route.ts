// src/app/api/users/settings/security/route.ts
import { auth } from "@/auth";
import { sendEmailVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateEmailVerificationToken } from "@/services/auth.service";
import { NextResponse } from "next/server";
import { z } from "zod";

/** GET - Returns security-relevant flags for the account settings page. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, email: true },
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // A token issued within the last 5 minutes means cooldown is still active
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        email: user.email,
        expires: { gt: new Date(Date.now() + 55 * 60 * 1000) },
      },
      select: { id: true, expires: true },
    });

    const pendingPasswordReset = await prisma.passwordResetToken.findFirst({
      where: { email: user.email, expires: { gt: new Date() } },
      select: { id: true, expires: true },
    });

    return NextResponse.json({
      emailVerified: user.emailVerified !== null,
      resendCooldown: recentToken !== null,
      resendCooldownExpiresAt: recentToken?.expires ?? null,
      passwordResetPending: pendingPasswordReset !== null,
      passwordResetExpiresAt: pendingPasswordReset?.expires ?? null,
    });
  } catch (error) {
    console.error("[Security GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const resendSchema = z.object({
  action: z.literal("resend-verification"),
  locale: z.enum(["da", "en"]).default("da"),
});

/** POST - Resends the email verification email (rate-limited to once per 5 minutes). */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, email: true, locale: true },
    });

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.emailVerified !== null)
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 },
      );

    // Rate limit: block if a token was issued within the last 5 minutes.
    // A fresh token expires in exactly 1 hour, so expires > now + 55min means < 5min old.
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        email: user.email,
        expires: { gt: new Date(Date.now() + 55 * 60 * 1000) },
      },
    });

    if (recentToken) {
      console.log("[Security POST] Resend rate-limited for:", user.email);
      return NextResponse.json({ error: "cooldown" }, { status: 429 });
    }

    const tokenRecord = await generateEmailVerificationToken(
      session.user.id,
      user.email,
    );

    console.log(
      `[Verification Email] Issuing verification token for: ${user.email}`,
    );
    await sendEmailVerificationEmail(
      user.email,
      tokenRecord.token,
      parsed.data.locale,
    );
    console.log(
      `[Verification Email] Verification email sent to: ${user.email}`,
    );

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("[Security POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
