// src/app/api/user/confirm-username/route.ts
import { prisma } from "@/lib/prisma";
import { verifyUsernameChangeToken } from "@/services/auth.service";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET - Validates the token only. The new username is chosen on the confirmation page.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) return NextResponse.json({ valid: false, reason: "missing" });

    const record = await prisma.usernameChangeToken.findUnique({
      where: { token },
    });

    if (!record)
      return NextResponse.json({ valid: false, reason: "not_found" });

    if (new Date(record.expires) < new Date())
      return NextResponse.json({ valid: false, reason: "expired" });

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { username: true },
    });
    return NextResponse.json({
      valid: true,
      currentUsername: user?.username ?? "",
    });
  } catch (error) {
    console.error("[Confirm Username GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const postSchema = z.object({
  token: z.string().min(1),
  newUsername: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_-]+$/),
});

/**
 * POST - Accepts the token and the chosen new username, validates availability,
 * and commits the change in a transaction.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const { token, newUsername } = parsed.data;

    const tokenRecord = await verifyUsernameChangeToken(token);

    const currentUser = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: { username: true },
    });
    if (currentUser?.username === newUsername)
      return NextResponse.json({ error: "same_username" }, { status: 400 });

    const taken = await prisma.user.findUnique({
      where: { username: newUsername },
    });
    if (taken && taken.id !== tokenRecord.userId)
      return NextResponse.json({ error: "username_taken" }, { status: 409 });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          username: newUsername,
          usernameChangedAt: new Date(),
        },
      }),
      prisma.usernameChangeToken.delete({ where: { id: tokenRecord.id } }),
    ]);

    console.log(
      `[Confirm Username] Username updated to @${newUsername} for user ${tokenRecord.userId}`,
    );

    return NextResponse.json({ newUsername });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "Invalid token" || message === "Token has expired")
      return NextResponse.json({ error: message }, { status: 400 });

    console.error("[Confirm Username POST Error]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
