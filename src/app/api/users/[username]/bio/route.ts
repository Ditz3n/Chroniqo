// src/app/api/users/[username]/bio/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bioSchema = z.object({
  bio: z
    .string()
    .max(150, "Bio cannot exceed 150 characters")
    .nullable()
    .optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    const { username } = await params;

    // Security: Users can only update their own bio
    if (!session?.user?.id || session.user.username !== username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid bio format or length" },
        { status: 400 },
      );
    }

    // Server-side empty line stripping
    const cleanBio = parsed.data.bio
      ? parsed.data.bio
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "")
          .join("\n")
      : null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { bio: cleanBio },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Update Bio Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
