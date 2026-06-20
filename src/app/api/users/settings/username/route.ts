// src/app/api/users/settings/username/route.ts
import { auth } from "@/auth";
import { updateUsernameSchema } from "@/lib/dtos/user.dto";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const USERNAME_COOLDOWN_DAYS = 30;
const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * GET - checks whether a given username is available.
 * Used for debounced availability feedback in the settings UI.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") ?? "";

    if (username.length < 3) {
      return NextResponse.json({ available: false });
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    // The username is available if nobody has it, or if it already belongs to the requester
    const available = !existing || existing.id === session.user.id;
    return NextResponse.json({ available });
  } catch (error) {
    console.error("[Username GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - changes the authenticated user's username.
 * Enforces a 30-day cooldown between changes.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateUsernameSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );

    const { username: newUsername } = parsed.data;

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, usernameChangedAt: true },
    });

    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // No-op if the username is unchanged
    if (currentUser.username === newUsername)
      return NextResponse.json(
        { message: "Username unchanged" },
        { status: 200 },
      );

    // Enforce 30-day cooldown
    if (currentUser.usernameChangedAt) {
      const elapsed = Date.now() - currentUser.usernameChangedAt.getTime();
      if (elapsed < USERNAME_COOLDOWN_MS) {
        const daysRemaining = Math.ceil(
          (USERNAME_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000),
        );
        return NextResponse.json(
          { error: "COOLDOWN", daysRemaining },
          { status: 429 },
        );
      }
    }

    // Uniqueness check
    const existing = await prisma.user.findUnique({
      where: { username: newUsername },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: newUsername,
        usernameChangedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Username updated", username: newUsername },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Username PATCH Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
