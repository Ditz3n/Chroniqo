// src/app/api/admin/communities/[name]/warnings/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const targetCommunity = await prisma.community.findUnique({
      where: { name: decodedName },
      select: { id: true },
    });

    if (!targetCommunity) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    await prisma.adminWarning.deleteMany({
      where: { targetCommunityId: targetCommunity.id },
    });

    return NextResponse.json(
      { message: "All warnings cleared" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin Comm Warnings DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
