// src/app/api/auth/forgot-password/route.ts
import { forgotPasswordSchema } from "@/lib/dtos/auth.dto";
import { sendPasswordResetEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/services/auth.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedData = forgotPasswordSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const { email } = parsedData.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isDummy: true, hashedPassword: true },
    });

    // Explicitly block dummy accounts from generating reset tokens and returning success
    if (existingUser?.isDummy) {
      return NextResponse.json(
        { error: "dummy_account_blocked_reset" },
        { status: 400 },
      );
    }

    if (existingUser && existingUser.hashedPassword) {
      const existingToken = await prisma.passwordResetToken.findFirst({
        where: { email, expires: { gt: new Date() } },
      });

      if (!existingToken) {
        console.log(`[Forgot Password] Issuing reset token for: ${email}`);
        const passwordResetToken = await generatePasswordResetToken(
          existingUser.id,
          email,
        );
        await sendPasswordResetEmail(
          passwordResetToken.email,
          passwordResetToken.token,
          parsedData.data.locale,
        );
        console.log(`[Forgot Password] Reset email sent to: ${email}`);
      } else {
        console.log(
          `[Forgot Password] Active token already exists for: ${email}`,
        );
      }
    }

    return NextResponse.json(
      { message: "If an account exists, a reset email has been sent." },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Forgot Password API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
