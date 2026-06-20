// src/app/api/minigames/[id]/move/route.ts
import { auth } from "@/auth";
import { makeMoveSchema } from "@/lib/dtos/minigame.dto";
import { makeMove } from "@/services/minigame.service";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = makeMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const game = await makeMove(id, session.user.id, parsed.data.position);
    return NextResponse.json({ game });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const statusMap: Record<string, number> = {
      GAME_NOT_FOUND: 404,
      NOT_A_PARTICIPANT: 403,
      GAME_NOT_ACTIVE: 409,
      NOT_YOUR_TURN: 409,
      INVALID_MOVE: 422,
    };
    return NextResponse.json({ error: msg }, { status: statusMap[msg] ?? 500 });
  }
}
