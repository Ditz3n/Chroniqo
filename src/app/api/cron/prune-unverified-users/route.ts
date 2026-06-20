// src/app/api/cron/prune-unverified-users/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete credentials-only users who never clicked their signup verification link.
    // Cutoff is 24 hours - matching the token expiry set in generateSignupVerificationToken.
    // Guards: no signupVerified set, created more than 24h ago, no linked OAuth accounts, not a dummy.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await prisma.user.deleteMany({
      where: {
        signupVerified: null,
        createdAt: { lte: cutoff },
        accounts: { none: {} },
        isDummy: false,
      },
    });

    console.log(`[CronPruneUnverified] Deleted ${result.count} ghost accounts`);

    return NextResponse.json({
      success: true,
      message: `Pruned ${result.count} unverified ghost accounts.`,
    });
  } catch (error) {
    console.error("[CronPruneUnverified Error]:", error);
    return NextResponse.json(
      { error: "Failed to prune unverified users" },
      { status: 500 },
    );
  }
}
