// src/app/api/minigames/history/[userId]/route.ts
import { auth } from "@/auth";
import { getGameHistory } from "@/services/minigame.service";
import { NextResponse } from "next/server";

// Returns all completed games between the authenticated user and [userId].
// History persists even if the shared conversation is deleted.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const games = await getGameHistory(session.user.id, userId);
    return NextResponse.json({ games });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
