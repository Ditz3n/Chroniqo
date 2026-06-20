// src/app/api/user/username-change-request/route.ts
import { auth } from "@/auth";
import { USERNAME_COOLDOWN_DAYS } from "@/lib/constants";
import { sendUsernameChangeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateUsernameChangeToken } from "@/services/auth.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  locale: z.enum(["da", "en"]).default("da"),
});

/**
 * POST - Issues a username change confirmation token and sends it by email.
 * The desired new username is collected on the confirmation page, not here.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const parsed = postSchema.safeParse(body);
    const requestLocale = parsed.success ? parsed.data.locale : "da";

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, locale: true, usernameChangedAt: true },
    });
    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Block if still within the 30-day cooldown from the last change
    if (currentUser.usernameChangedAt) {
      const cooldownUntil = new Date(
        currentUser.usernameChangedAt.getTime() +
          USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
      );
      if (cooldownUntil > new Date()) {
        const daysRemaining = Math.ceil(
          (cooldownUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        );
        return NextResponse.json(
          { error: "cooldown", daysRemaining },
          { status: 429 },
        );
      }
    }

    // Rate limit: one pending token at a time
    const pending = await prisma.usernameChangeToken.findFirst({
      where: { userId: session.user.id, expires: { gt: new Date() } },
      select: { expires: true },
    });
    if (pending)
      return NextResponse.json(
        { error: "pending_token", expiresAt: pending.expires },
        { status: 429 },
      );

    console.log(
      `[Username Change] Issuing change token for: ${currentUser.email}`,
    );
    const tokenRecord = await generateUsernameChangeToken(
      session.user.id,
      currentUser.email,
    );
    await sendUsernameChangeEmail(
      currentUser.email,
      tokenRecord.token,
      requestLocale,
    );
    console.log(`[Username Change] Change email sent to: ${currentUser.email}`);

    return NextResponse.json({ message: "Username change email sent" });
  } catch (error) {
    console.error("[UsernameChangeRequest POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** GET - Returns whether the user has a pending username change token. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pending = await prisma.usernameChangeToken.findFirst({
      where: { userId: session.user.id, expires: { gt: new Date() } },
      select: { expires: true },
    });

    return NextResponse.json({
      pendingToken: pending ? { expiresAt: pending.expires } : null,
    });
  } catch (error) {
    console.error("[UsernameChangeRequest GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
