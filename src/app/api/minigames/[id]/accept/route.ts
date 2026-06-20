// src/app/api/minigames/[id]/accept/route.ts
import { auth } from "@/auth";
import { acceptGame } from "@/services/minigame.service";
import { NextResponse } from "next/server";

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
    const game = await acceptGame(id, session.user.id);
    return NextResponse.json({ game });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const statusMap: Record<string, number> = {
      GAME_NOT_FOUND: 404,
      NOT_THE_CHALLENGED_PLAYER: 403,
      GAME_NOT_PENDING: 409,
    };
    return NextResponse.json({ error: msg }, { status: statusMap[msg] ?? 500 });
  }
}
