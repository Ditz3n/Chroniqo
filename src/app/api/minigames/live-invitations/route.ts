// src/app/api/minigames/live-invitations/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const playerSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  avatarEmoji: true,
  avatarBgColor: true,
} as const;

const gameInclude = {
  player1: { select: playerSelect },
  player2: { select: playerSelect },
  winner: { select: playerSelect },
} as const;

// Returns two lists for the polling watcher:
//   invitations  - LIVE PENDING games where this user is player2 (challenged)
//   activeTurns  - LIVE ACTIVE games where it is currently this user's turn
//                  (notifies player1 when player2 accepts, or either player on re-login)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [invitations, activeTurns] = await Promise.all([
    prisma.minigame.findMany({
      where: { player2Id: userId, mode: "LIVE", status: "PENDING" },
      include: gameInclude,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.minigame.findMany({
      where: {
        mode: "LIVE",
        status: "ACTIVE",
        currentTurnId: userId,
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      include: gameInclude,
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ invitations, activeTurns });
}
