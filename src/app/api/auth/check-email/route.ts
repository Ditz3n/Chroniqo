// src/app/api/auth/check-email/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkEmailSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { email } = parsed.data;

    // PREVENT DUMMY LOGIN: Return a specific error code to the UI
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.isDummy) {
      return NextResponse.json(
        { error: "dummy_account_blocked_login" },
        { status: 400 },
      );
    }

    // Check if the email is globally banned
    const activeBan = await prisma.globalBan.findFirst({
      where: {
        email,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (activeBan) {
      // Generate a fresh delete token so they can delete their data from the modal
      const token = crypto.randomUUID();
      await prisma.globalBan.update({
        where: { id: activeBan.id },
        data: { deleteToken: token },
      });

      return NextResponse.json(
        {
          isBanned: true,
          token,
          reason: activeBan.reason,
          expires: activeBan.expiresAt,
          dataAlreadyDeleted: activeBan.userId === null,
        },
        { status: 200 },
      );
    }

    // Email is not banned. We return false to let the user proceed to the password step.
    return NextResponse.json({ isBanned: false }, { status: 200 });
  } catch (error) {
    console.error("[Check Email Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
