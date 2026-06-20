// src/app/api/users/requests/[id]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "ACCEPT" | "DECLINE"

    const friendReq = await prisma.friendRequest.findUnique({ where: { id } });
    if (!friendReq || friendReq.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "ACCEPT") {
      await prisma.$transaction([
        prisma.friendRequest.delete({
          where: { id },
        }),
        prisma.friendship.create({
          data: { userId: friendReq.senderId, friendId: friendReq.receiverId },
        }),
        prisma.friendship.create({
          data: { userId: friendReq.receiverId, friendId: friendReq.senderId },
        }),
      ]);
    } else if (action === "DECLINE") {
      await prisma.friendRequest.delete({ where: { id } });
    }

    return NextResponse.json({ message: `Request ${action}` }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
