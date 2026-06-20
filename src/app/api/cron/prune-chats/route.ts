// src/app/api/cron/prune-chats/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Optional: Verify Vercel Cron Secret to ensure only Vercel can trigger this
  // Doing it for security, since this endpoint can delete data if misused
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Because of having ON DELETE CASCADE in schema.prisma on Messages and Participants,
    // deleting the conversation automatically cleans up everything inside it.
    // Also prune chats that were manually scheduled for deletion and have reached their due time.
    const result = await prisma.conversation.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: new Date() } },
          { deletionScheduledAt: { lte: new Date() } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pruned ${result.count} expired/deleted conversations.`,
    });
  } catch (error) {
    console.error("[Cron Error]:", error);
    return NextResponse.json(
      { error: "Failed to prune chats" },
      { status: 500 },
    );
  }
}
