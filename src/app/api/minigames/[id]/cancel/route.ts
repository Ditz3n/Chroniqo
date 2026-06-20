// src/app/api/minigames/[id]/cancel/route.ts
import { auth } from "@/auth";
import { cancelGame } from "@/services/minigame.service";
import { NextResponse } from "next/server";

// Handles both "cancel" (initiator abandons) and "decline" (challenged player rejects).
// The service determines which based on who calls it and the current game status.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const game = await cancelGame(id, session.user.id);
    return NextResponse.json({ game });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const statusMap: Record<string, number> = {
      GAME_NOT_FOUND: 404,
      NOT_A_PARTICIPANT: 403,
      GAME_ALREADY_ENDED: 409,
    };
    return NextResponse.json({ error: msg }, { status: statusMap[msg] ?? 500 });
  }
}
