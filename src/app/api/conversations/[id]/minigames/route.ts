// src/app/api/conversations/[id]/minigames/route.ts
import { auth } from "@/auth";
import { getConversationActiveGames } from "@/services/minigame.service";
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
    const games = await getConversationActiveGames(id, session.user.id);
    return NextResponse.json({ games });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "NOT_A_PARTICIPANT") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
