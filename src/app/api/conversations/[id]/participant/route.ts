// src/app/api/conversations/[id]/participant/route.ts
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

    const { id: conversationId } = await params;
    const body = await request.json();
    const { action } = body; // "ACCEPT" | "DECLINE"

    if (action === "ACCEPT") {
      await prisma.$transaction([
        prisma.conversationParticipant.update({
          where: {
            userId_conversationId: { userId: session.user.id, conversationId },
          },
          data: { status: "ACCEPTED" },
        }),
        prisma.message.create({
          data: {
            conversationId,
            senderId: session.user.id,
            content: "",
            isSystem: true,
            messageType: "REQUEST_ACCEPTED",
          },
        }),
      ]);
    } else {
      // DECLINE
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      });

      if (conv?.participants.length === 2) {
        await prisma.conversation.delete({ where: { id: conversationId } }); // Delete 1:1 chat entirely
      } else {
        await prisma.conversationParticipant.delete({
          where: {
            userId_conversationId: { userId: session.user.id, conversationId },
          },
        });
      }
    }

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
