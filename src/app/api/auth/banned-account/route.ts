const banCheckSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = banCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { email } = parsed.data;

    const activeBan = await prisma.globalBan.findFirst({
      where: {
        email,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!activeBan) {
      return NextResponse.json({ isBanned: false });
    }

    return NextResponse.json({
      isBanned: true,
      token: activeBan.deleteToken ?? null,
      reason: activeBan.reason ?? null,
      expires: activeBan.expiresAt ?? null,
      dataAlreadyDeleted: activeBan.userId === null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check ban" }, { status: 500 });
  }
}
// src/app/api/auth/banned-account/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const deleteBannedAccountSchema = z.object({
  token: z.string().min(1),
});

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsedData = deleteBannedAccountSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { token } = parsedData.data;

    // 1. Find the GlobalBan record with this token
    const activeBan = await prisma.globalBan.findUnique({
      where: { deleteToken: token },
    });

    if (!activeBan || !activeBan.isActive) {
      return NextResponse.json(
        { error: "Invalid or expired deletion token" },
        { status: 401 }, // 401 Unauthorized because the token is essentially their auth ticket
      );
    }

    // 2. If the ban is linked to a user, delete the user
    // The schema specifies `onDelete: SetNull` for the GlobalBan relation on the User model.
    // This means the GlobalBan record will remain intact (keeping the email banned),
    // but the user's data (posts, comments, profile) will be wiped.
    if (activeBan.userId) {
      await prisma.user.delete({
        where: { id: activeBan.userId },
      });
    }

    // 3. Clear the token so it cannot be reused
    await prisma.globalBan.update({
      where: { id: activeBan.id },
      data: { deleteToken: null },
    });

    return NextResponse.json(
      { message: "Account data deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Banned Account Deletion Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
