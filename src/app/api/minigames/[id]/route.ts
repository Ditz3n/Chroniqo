// src/app/api/minigames/[id]/route.ts
import { auth } from "@/auth";
import { getGame } from "@/services/minigame.service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const game = await getGame(id, session.user.id);
    return NextResponse.json({ game });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "GAME_NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === "NOT_A_PARTICIPANT") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
