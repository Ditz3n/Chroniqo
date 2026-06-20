// src/app/api/auth/signup-verification-status/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET - Returns the current signup verification status for the authenticated user,
 * plus the token creation time so the client can compute the resend cooldown accurately.
 * Polled every 3 seconds by the EmailVerificationGate component.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      signupVerified: true,
      signupVerificationToken: {
        select: { createdAt: true },
      },
    },
  });

  return NextResponse.json({
    verified: !!user?.signupVerified,
    // Lets the client calculate remaining cooldown without its own clock
    tokenCreatedAt: user?.signupVerificationToken?.createdAt ?? null,
  });
}
