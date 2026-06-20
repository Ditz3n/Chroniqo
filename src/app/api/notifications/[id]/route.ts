// src/app/api/notifications/[id]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404 },
      );
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Notification deleted" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Notification DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
