// src/app/api/minigames/route.ts
import { auth } from "@/auth";
import { createMinigameSchema } from "@/lib/dtos/minigame.dto";
import { createGame } from "@/services/minigame.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createMinigameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const game = await createGame(parsed.data, session.user.id);
    return NextResponse.json({ game }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const statusMap: Record<string, number> = {
      CONVERSATION_NOT_FOUND: 404,
      COMMUNITY_CHAT_NOT_ALLOWED: 403,
      NOT_A_DIRECT_CHAT: 403,
      NOT_A_PARTICIPANT: 403,
      OPPONENT_NOT_IN_CHAT: 404,
      GAME_ALREADY_ACTIVE: 409,
    };
    return NextResponse.json({ error: msg }, { status: statusMap[msg] ?? 500 });
  }
}
