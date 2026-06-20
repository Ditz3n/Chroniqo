// src/app/api/user/delete-request/route.ts
import { auth } from "@/auth";
import { sendAccountDeletionEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateAccountDeletionToken } from "@/services/auth.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  locale: z.enum(["da", "en"]).default("da"),
});

// Sends a deletion confirmation email to the authenticated user's email address
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    const locale = parsed.success ? parsed.data.locale : "da";

    // Block sending if a valid token already exists - prevents email spam
    const existing = await prisma.accountDeletionToken.findFirst({
      where: {
        userId: session.user.id,
        expires: { gt: new Date() },
      },
      select: { expires: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "pending_token", expiresAt: existing.expires },
        { status: 429 },
      );
    }

    console.log(
      `[Delete Request] Issuing deletion token for: ${session.user.email}`,
    );

    const tokenRecord = await generateAccountDeletionToken(
      session.user.id,
      session.user.email,
    );
    await sendAccountDeletionEmail(
      session.user.email,
      tokenRecord.token,
      locale,
    );

    console.log(
      `[Delete Request] Deletion email sent to: ${session.user.email}`,
    );

    return NextResponse.json({ message: "Deletion confirmation email sent" });
  } catch (error) {
    console.error("[Delete Request POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Called with ?token=... to validate a specific token (confirm-delete page).
// Called without a token to check whether a pending token already exists for the session user.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    // Token validation - no session required, token is proof of identity
    if (token) {
      const record = await prisma.accountDeletionToken.findUnique({
        where: { token },
      });

      if (!record) {
        return NextResponse.json({ valid: false, reason: "not_found" });
      }
      if (new Date(record.expires) < new Date()) {
        return NextResponse.json({ valid: false, reason: "expired" });
      }
      return NextResponse.json({ valid: true });
    }

    // No token - check for pending token on the authenticated user's account
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.accountDeletionToken.findFirst({
      where: {
        userId: session.user.id,
        expires: { gt: new Date() },
      },
      select: { expires: true },
    });

    return NextResponse.json({
      valid: false,
      reason: "missing_token",
      pendingToken: existing ? { expiresAt: existing.expires } : null,
    });
  } catch (error) {
    console.error("[Delete Request GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
